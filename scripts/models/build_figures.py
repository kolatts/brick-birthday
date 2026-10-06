"""
Builds Luna's brick-figure family in Blender (headless) and exports one Draco-compressed .glb per figure.

    blender --background --python scripts/models/build_figures.py -- [--out public/models] [--only luna,rudolph]

(`npm run models:build` finds blender.exe for you, runs this, copies the Draco decoder and checks sizes.)

Authoring frame = three.js frame (Y up, +Z is the figure's front) so numbers match src/three/avatarParts.ts one to one;
the glTF is exported with export_yup=False, so nothing is rotated. Parameters live in scripts/models/figures.json.

Scene contract used by src/three/Avatar.tsx (node names matter):
  Head      empty at the head centre (nods)            -> HeadMesh (skull, ears, hair, accessory), FacePlate, Item_bow/visor/sunglasses
  ArmL/ArmR empties at the shoulder pivots (wave/swing)-> ArmMeshL/R (+ Item_<id>__sleeve* garments)
  Tail      empty at the rump (pets, wags)             -> TailMesh
  Body      static mesh (legs, torso, studs, shoes, prop) and Item_dress / Item_cape / Item_labcoat / Item_boots (Luna), Item_pethats
  FacePlate is UV mapped 0..1 (u across, v up) with a placeholder material the runtime replaces by the portrait texture.
All other meshes carry vertex colours (COLOR_0) on one shared material "figure".
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPEC = json.load(open(os.path.join(HERE, "figures.json")))
HEAD = SPEC["headSpec"]
TAU = math.pi * 2


# ----------------------------------------------------------------------------- colour helpers
def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_linear(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4)) + (1.0,)


def mix(a, b, t):
    pa, pb = int(a.lstrip("#"), 16), int(b.lstrip("#"), 16)
    ch = lambda s: round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
    return "#%02X%02X%02X" % (ch(16), ch(8), ch(0))


lighten = lambda c, t: mix(c, "#FFFFFF", t)
darken = lambda c, t: mix(c, "#1D2A44", t)


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ----------------------------------------------------------------------------- shapes: (verts, faces, modifiers, closed)
class Shape:
    def __init__(self, verts, faces, mods=None, closed=True):
        self.verts, self.faces, self.mods, self.closed = verts, faces, mods or [], closed


def lathe(profile, segs, phi0=0.0, phi_len=TAU, zs=1.0):
    """Surface of revolution about Y. profile = [(r, y)] ascending -> normals point away from the axis."""
    full = abs(phi_len - TAU) < 1e-6
    cols = segs if full else segs + 1
    verts, index = [], {}
    n = len(profile)
    for c in range(cols):
        phi = phi0 + phi_len * c / segs
        s, co = math.sin(phi), math.cos(phi)
        for i, (r, y) in enumerate(profile):
            if r < 1e-9:
                if ("pole", i) not in index:
                    index[("pole", i)] = len(verts)
                    verts.append((0.0, y, 0.0))
                index[(c, i)] = index[("pole", i)]
            else:
                index[(c, i)] = len(verts)
                verts.append((r * s, y, r * co * zs))
    faces = []
    for c in range(segs):
        c1 = (c + 1) % cols if full else c + 1
        for i in range(n - 1):
            q = [index[(c, i)], index[(c1, i)], index[(c1, i + 1)], index[(c, i + 1)]]
            u = []
            for k in q:
                if k not in u:
                    u.append(k)
            if len(u) >= 3:
                faces.append(tuple(u))
    sh = Shape(verts, faces, closed=full and profile[0][0] < 1e-9 and profile[-1][0] < 1e-9)
    sh.oriented = True
    return sh


def sphere(rx, ry, rz, segs=24, rings=14):
    prof = [(math.sin(math.pi * k / rings), -math.cos(math.pi * k / rings)) for k in range(rings + 1)]
    sh = lathe(prof, segs)
    sh.verts = [(x * rx, y * ry, z * rz) for x, y, z in sh.verts]
    return sh


def capsule(r, length, segs=16, rings=6):
    """Capsule along Y: `length` is the straight part between the hemispheres."""
    prof = []
    for k in range(rings + 1):
        a = -math.pi / 2 + (math.pi / 2) * k / rings
        prof.append((math.cos(a) * r, -length / 2 + math.sin(a) * r))
    for k in range(rings + 1):
        a = (math.pi / 2) * k / rings
        prof.append((math.cos(a) * r, length / 2 + math.sin(a) * r))
    prof[0] = (0.0, prof[0][1])
    prof[-1] = (0.0, prof[-1][1])
    return lathe(prof, segs)


def cylinder(rb, rt, h, segs=24):
    prof = [(0.0, -h / 2), (rb, -h / 2), (rt, h / 2), (0.0, h / 2)]
    return lathe(prof, segs)


def cone_soft(r, h, segs=16):
    sh = cone(r, h, segs)
    sh.mods = [("SUBSURF", dict(levels=1, render_levels=1))]
    return sh


def cone(r, h, segs=16):
    return lathe([(0.0, -h / 2), (r, -h / 2), (0.0, h / 2)], segs)


def torus(R, tube, arc=TAU, segs=32, rsegs=12):
    """Torus arc in the XY plane starting at +x (like three's TorusGeometry), tube cross-section radius `tube`."""
    full = abs(arc - TAU) < 1e-6
    cols = segs if full else segs + 1
    verts, faces = [], []
    for i in range(cols):
        u = arc * i / segs
        for j in range(rsegs):
            v = TAU * j / rsegs
            rr = R + tube * math.cos(v)
            verts.append((rr * math.cos(u), rr * math.sin(u), tube * math.sin(v)))
    for i in range(segs):
        i1 = (i + 1) % cols if full else i + 1
        for j in range(rsegs):
            j1 = (j + 1) % rsegs
            faces.append((i * rsegs + j, i1 * rsegs + j, i1 * rsegs + j1, i * rsegs + j1))
    sh = Shape(verts, faces, closed=full)
    if not full:  # round the two ends with spheres
        sh.ends = [(R * math.cos(0.0), R * math.sin(0.0)), (R * math.cos(arc), R * math.sin(arc))]
    return sh


def box(w, h, d, taper=1.0, bevel=0.1, bseg=3, sub=1):
    """Cage box (optionally narrower at the bottom) rounded with Bevel + Subdivision modifiers."""
    pts = []
    for sy in (-1, 1):
        f = taper + (1 - taper) * (0.0 if sy < 0 else 1.0)
        for sz in (-1, 1):
            for sx in (-1, 1):
                pts.append((sx * w / 2 * f, sy * h / 2, sz * d / 2 * (0.9 + 0.1 * (0.0 if sy < 0 else 1.0))))
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    mods = [("BEVEL", dict(width=bevel, segments=bseg, limit_method="NONE", profile=0.7))]
    if sub:
        mods.append(("SUBSURF", dict(levels=sub, render_levels=sub)))
    return Shape(pts, faces, mods)


def prism(poly, depth, bevel=0.03, bseg=3, sub=1):
    """Extrude a CCW polygon [(x,y)] along z (centred), rounded by Bevel + Subdivision."""
    n = len(poly)
    verts = [(x, y, depth / 2) for x, y in poly] + [(x, y, -depth / 2) for x, y in poly]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, n + i, n + j, j))
    mods = [("BEVEL", dict(width=bevel, segments=bseg, limit_method="NONE", profile=0.7))]
    if sub:
        mods.append(("SUBSURF", dict(levels=sub, render_levels=sub)))
    return Shape(verts, faces, mods)


def tube(points, radius_fn, tubular=24, radial=12):
    """Tube along a Catmull-Rom spline with a radius that varies along it (tails)."""
    pts = [Vector(p) for p in points]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]

    def at(t):
        f = t * (len(pts) - 1)
        i = min(int(f), len(pts) - 2)
        u = f - i
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)

    centers = [at(i / tubular) for i in range(tubular + 1)]
    verts, faces = [], []
    prev_n = None
    for i, c in enumerate(centers):
        tan = (centers[min(i + 1, tubular)] - centers[max(i - 1, 0)]).normalized()
        if prev_n is None:
            ref = Vector((1, 0, 0)) if abs(tan.x) < 0.9 else Vector((0, 1, 0))
            nrm = tan.cross(ref).normalized()
        else:
            nrm = (prev_n - tan * prev_n.dot(tan)).normalized()
        prev_n = nrm
        bi = tan.cross(nrm)
        r = radius_fn(i / tubular)
        for j in range(radial):
            v = TAU * j / radial
            verts.append(tuple(c + (nrm * math.cos(v) + bi * math.sin(v)) * r))
    for i in range(tubular):
        for j in range(radial):
            j1 = (j + 1) % radial
            faces.append((i * radial + j, i * radial + j1, (i + 1) * radial + j1, (i + 1) * radial + j))
    faces.append(tuple(range(radial - 1, -1, -1)))
    faces.append(tuple(tubular * radial + j for j in range(radial)))
    return Shape(verts, faces, [("SUBSURF", dict(levels=1, render_levels=1))])


# ----------------------------------------------------------------------------- head sculpt (port of figureGeometry.ts)
def head_profile(s, n=1.0):
    r, h, b, tb, cheek, cy = s["r"], s["h"], s["bevel"], s["topBevel"], s["cheek"], s["cheekY"]
    pts = [(0.0, -h / 2)]
    nb = int(6 * n)
    for i in range(nb + 1):
        a = -math.pi / 2 + (math.pi / 2) * i / nb
        pts.append((r - b + math.cos(a) * b, -h / 2 + b + math.sin(a) * b))
    y0, y1 = -h / 2 + b, h / 2 - tb
    ns = int(12 * n)
    for k in range(1, ns):
        y = y0 + (y1 - y0) * k / ns
        pts.append((r + cheek * math.exp(-(((y - cy) / 0.2) ** 2)), y))
    nt = int(10 * n)
    for i in range(nt + 1):
        a = (math.pi / 2) * i / nt
        pts.append((r - tb + math.cos(a) * tb, h / 2 - tb + math.sin(a) * tb))
    pts.append((0.0, h / 2))
    return pts


def profile_radius(pts, y):
    for i in range(1, len(pts)):
        a, b = pts[i - 1], pts[i]
        if a[1] - 1e-9 <= y <= b[1] + 1e-9 and b[1] > a[1] + 1e-9:
            return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
    return pts[-1][0]


def head_shape(s, segs=64):
    return lathe(head_profile(s), segs, zs=s["depth"])


def plate_shape(s, y_lo, y_hi, arc_w, off=0.012, nx=32, ny=16, bumps=()):
    """Face plate on the exact head profile (uv 0..1, u across, v up) a hair above the skin."""
    prof = head_profile(s, 2.0)
    verts, uvs = [], []
    for i in range(ny + 1):
        v = i / ny
        y = y_lo + (y_hi - y_lo) * v
        rho0 = profile_radius(prof, y) + off
        for j in range(nx + 1):
            u = j / nx
            rho = rho0 + sum(a * math.exp(-(((u - u0) / su) ** 2 + ((v - v0) / sv) ** 2)) for u0, v0, su, sv, a in bumps)
            th = (u - 0.5) * (arc_w / s["r"])
            verts.append((math.sin(th) * rho, y, math.cos(th) * rho * s["depth"]))
            uvs.append((u, v))
    faces = []
    row = nx + 1
    for i in range(ny):
        for j in range(nx):
            a = i * row + j
            faces.append((a, a + 1, a + row + 1, a + row))
    sh = Shape(verts, faces, closed=False)
    sh.uvs = uvs
    return sh


def hair_cap(s, hairline, thick, top_thick=None, wave=None, cols=64, rows=18):
    """Continuous hair shell with a shaped hairline (high at the forehead, dipping over ears / nape)."""
    src = [p for p in head_profile(s, 2.0) if p[1] > -s["h"] / 2 + s["bevel"] * 0.5]
    top_t = top_thick if top_thick is not None else thick
    prof_h = head_profile(s, 2.0)
    top_y = s["h"] / 2
    off = []
    for i, p in enumerate(src):
        a, b = src[max(0, i - 1)], src[min(len(src) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy) or 1.0
        k = min(1.0, max(0.0, (p[1] + 0.15) / (top_y + 0.15)))
        t = thick + (top_t - thick) * k * k
        off.append((max(0.0, p[0] + dy / l * t), p[1] - dx / l * t))
    off[-1] = (0.0, off[-1][1])
    cum = [0.0]
    for i in range(1, len(off)):
        cum.append(cum[-1] + math.hypot(off[i][0] - off[i - 1][0], off[i][1] - off[i - 1][1]))
    total = cum[-1]

    def at(sl):
        for i in range(1, len(off)):
            if sl <= cum[i] + 1e-9:
                u = (sl - cum[i - 1]) / max(1e-9, cum[i] - cum[i - 1])
                return off[i - 1][0] + (off[i][0] - off[i - 1][0]) * u, off[i - 1][1] + (off[i][1] - off[i - 1][1]) * u
        return off[-1]

    def s_at_y(y):
        for i in range(1, len(off)):
            if off[i][1] >= y and off[i][1] > off[i - 1][1]:
                return cum[i - 1] + (cum[i] - cum[i - 1]) * (y - off[i - 1][1]) / (off[i][1] - off[i - 1][1])
        return total - 0.05

    verts, faces = [], []
    for c in range(cols):
        phi = TAU * c / cols
        phs = phi - TAU if phi > math.pi else phi
        s0 = min(total - 0.08, s_at_y(hairline(phs)))
        for r in range(rows + 1):
            u = r / rows
            rho, y = at(s0 + (total - s0) * u)
            rho = profile_radius(prof_h, y) + 0.004 + (rho - profile_radius(prof_h, y) - 0.004) * smoothstep(0.0, 0.35, u)
            if wave and rho > 0.02:
                rho += wave[0] * math.sin(wave[1] * phi + wave[2] * y) * min(1.0, u * 3) * (1.0 if rho > 0.1 else rho / 0.1)
            if r == 0:
                rho = max(0.0, rho - thick * 0.85)
            verts.append((math.sin(phi) * rho, y, math.cos(phi) * rho * s["depth"]))
    row = rows + 1
    for c in range(cols):
        c1 = (c + 1) % cols
        for r in range(rows):
            faces.append((c * row + r, c1 * row + r, c1 * row + r + 1, c * row + r + 1))
    sh = Shape(verts, faces, [("SUBSURF", dict(levels=1, render_levels=1))], closed=False)
    sh.oriented = True
    return sh


def jaw_shell(s, y_lo, y_hi, half, thick, cols=44, rows=12):
    """Soft beard: a shell on the front of the jaw, thickest at the chin, feathering out at the edges, slightly rough."""
    prof = head_profile(s, 2.0)
    verts, faces = [], []
    for c in range(cols + 1):
        phi = -half + 2 * half * c / cols
        edge = 1 - smoothstep(half * 0.55, half, abs(phi))
        for r in range(rows + 1):
            y = y_lo + (y_hi - y_lo) * r / rows
            vy = smoothstep(y_lo, y_lo + 0.07, y) * (1 - smoothstep(y_hi - 0.1, y_hi, y))
            chin = 0.045 * math.exp(-((phi / 0.7) ** 2)) * (1 - smoothstep(y_lo + 0.05, y_hi - 0.02, y))
            nz = (math.sin(phi * 23 + y * 31) * 0.5 + math.sin(phi * 11 - y * 47) * 0.5) * 0.008
            rho = profile_radius(prof, y) + 0.006 + (thick * vy + chin + nz) * edge
            verts.append((math.sin(phi) * rho, y, math.cos(phi) * rho * s["depth"]))
    row = rows + 1
    for c in range(cols):
        for r in range(rows):
            faces.append((c * row + r, (c + 1) * row + r, (c + 1) * row + r + 1, c * row + r + 1))
    sh = Shape(verts, faces, [("SUBSURF", dict(levels=1, render_levels=1))], closed=False)
    sh.oriented = True
    return sh


# ----------------------------------------------------------------------------- roles: accumulate shapes into one vertex-coloured mesh
class Role:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.layer = self.bm.loops.layers.float_color.new("Col")

    def add(self, shape, color, pos=(0, 0, 0), rot=(0, 0, 0), sc=(1, 1, 1), rotmat=None):
        verts = [tuple(v) for v in shape.verts]
        mat = Matrix.LocRotScale(Vector(pos), rotmat.to_quaternion() if rotmat is not None else Euler(rot, "ZYX"), Vector(sc))
        me = bpy.data.meshes.new("part")
        me.from_pydata(verts, [], [tuple(f) for f in shape.faces])
        me.update()
        if shape.closed:
            tmp = bmesh.new()
            tmp.from_mesh(me)
            bmesh.ops.recalc_face_normals(tmp, faces=tmp.faces)
            tmp.to_mesh(me)
            tmp.free()
        elif not hasattr(shape, "uvs") and not getattr(shape, "oriented", False):
            # open shells: make normals point away from the part's own vertical axis
            cx = sum(v[0] for v in verts) / len(verts)
            cz = sum(v[2] for v in verts) / len(verts)
            score = 0.0
            for p in me.polygons:
                c = p.center
                score += p.normal.x * (c.x - cx) + p.normal.z * (c.z - cz)
            if score < 0:
                bm2 = bmesh.new()
                bm2.from_mesh(me)
                bmesh.ops.reverse_faces(bm2, faces=bm2.faces)
                bm2.to_mesh(me)
                bm2.free()
        if getattr(shape, "uvs", None):
            uv = me.uv_layers.new(name="UVMap")
            for poly in me.polygons:
                for li in poly.loop_indices:
                    uv.data[li].uv = shape.uvs[me.loops[li].vertex_index]
        if shape.mods:
            ob = bpy.data.objects.new("tmp", me)
            bpy.context.scene.collection.objects.link(ob)
            for kind, kw in shape.mods:
                m = ob.modifiers.new(kind, kind)
                for k, v in kw.items():
                    setattr(m, k, v)
            dg = bpy.context.evaluated_depsgraph_get()
            ev = ob.evaluated_get(dg)
            em = bpy.data.meshes.new_from_object(ev)
            bpy.context.scene.collection.objects.unlink(ob)
            bpy.data.objects.remove(ob)
            bpy.data.meshes.remove(me)
            me = em
        me.transform(mat)
        if mat.determinant() < 0:  # mirrored (negative scale): keep winding outward
            bm2 = bmesh.new()
            bm2.from_mesh(me)
            bmesh.ops.reverse_faces(bm2, faces=bm2.faces)
            bm2.to_mesh(me)
            bm2.free()
        start = len(self.bm.faces)
        self.bm.from_mesh(me)
        self.bm.faces.ensure_lookup_table()
        col = hex_linear(color) if isinstance(color, str) else color
        for f in self.bm.faces[start:]:
            f.smooth = True
            for l in f.loops:
                l[self.layer] = col
        bpy.data.meshes.remove(me)
        return self

    def finish(self, parent, material, pivot=(0, 0, 0)):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.color_attributes.active_color = me.color_attributes["Col"]
        me.materials.append(material)
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = parent
        return ob


def empty(name, parent, loc):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    return e


# ----------------------------------------------------------------------------- materials
def make_materials(skin):
    fig = bpy.data.materials.new("figure")
    fig.use_nodes = True
    nt = fig.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    cattr = nt.nodes.new("ShaderNodeVertexColor")
    cattr.layer_name = "Col"
    nt.links.new(cattr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.35
    bsdf.inputs["Metallic"].default_value = 0.0

    plate = bpy.data.materials.new("FacePlatePlaceholder")
    plate.use_nodes = True
    pb = plate.node_tree.nodes["Principled BSDF"]
    img = bpy.data.images.new("portrait_placeholder", 4, 4)
    img.pixels = list(hex_linear(skin)) * 16
    img.pack()
    tex = plate.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = img
    plate.node_tree.links.new(tex.outputs["Color"], pb.inputs["Base Color"])
    pb.inputs["Roughness"].default_value = 0.4
    return fig, plate


# ----------------------------------------------------------------------------- people
def rbox(w, h, d, r=0.1, taper=1.0, seg=3, sub=1):
    return box(w, h, d, taper=taper, bevel=min(r, w / 2.2, h / 2.2, d / 2.2), bseg=seg, sub=sub)


def foot_poly():
    return [(-0.2, 0.0), (0.02, 0.0), (0.06, 0.035), (0.11, 0.0), (0.34, 0.0), (0.4, 0.07), (0.36, 0.14), (0.14, 0.17), (0.06, 0.22), (-0.16, 0.22), (-0.22, 0.14)]


def foot_shape(width):
    # profile is drawn in (z, y) then turned so extrusion runs along x
    sh = prism(foot_poly(), width, bevel=0.035, bseg=2, sub=1)
    sh.verts = [(z, y, x) for x, y, z in sh.verts]  # (x,y,z)->(depth=x', y, z=x): extrusion axis becomes x
    sh.faces = [tuple(reversed(f)) for f in sh.faces]
    return sh


def c_hand(R, tube, sweep=math.radians(250)):
    """C-shaped hand (torus arc + rounded tips), gap facing +z, centred on the ring centre."""
    t = torus(R, tube, sweep, 20, 10)
    return t, sweep


def person_parts(fid, f, root, mats):
    figure_mat, plate_mat = mats
    skin, body_c = f.get("portraitSkin", f["skinTone"]), f["bodyColor"]  # head matches the portrait so the plate blends in
    hc, hcl = f["hairColor"], lighten(f["hairColor"], 0.16)
    leg_h = f["legH"]
    base = 0.2 + leg_h
    torso_h = SPEC["torso"]["h"]
    torso_y = base + torso_h / 2
    head_y = base + torso_h + HEAD["h"] / 2 - 0.05
    shoulder_y = base + torso_h - 0.16
    top = HEAD["h"] / 2
    prof = head_profile(HEAD, 2.0)
    r_at = lambda y: profile_radius(prof, y)

    # ---------------- Body (static)
    B = Role("Body")
    for sx in (-1, 1):
        B.add(rbox(0.34, leg_h + 0.06, 0.34, 0.12, taper=0.84), f["pants"], (sx * 0.2, 0.2 + leg_h / 2 + 0.03, 0))
        B.add(foot_shape(0.34), f["shoes"], (sx * 0.2, 0.0, -0.02))
    B.add(rbox(0.82, 0.2, 0.46, 0.09), f["pants"], (0, base + 0.02, 0))
    B.add(rbox(SPEC["torso"]["wTop"], torso_h, SPEC["torso"]["depth"], 0.17, taper=SPEC["torso"]["wBottom"] / SPEC["torso"]["wTop"], seg=5), body_c, (0, torso_y, 0))
    B.add(rbox(0.62, 0.48, 0.07, 0.025, seg=3), lighten(body_c, 0.28), (0, torso_y + 0.03, 0.295))
    for sx in (-1, 1):
        for sy in (-1, 1):
            st = lathe([(0.075, 0.0), (0.075, 0.035), (0.06, 0.05), (0.03, 0.058), (0.0, 0.06)], 20)
            B.add(st, lighten(body_c, 0.5), (sx * 0.15, torso_y + sy * 0.12 + 0.03, 0.33), rot=(math.pi / 2, 0, 0))
    B.add(cylinder(0.16, 0.16, 0.2, 20), skin, (0, base + torso_h + 0.03, 0))
    B.add(torus(0.2, 0.04, TAU, 32, 10), lighten(body_c, 0.22), (0, base + torso_h + 0.005, 0), rot=(math.pi / 2, 0, 0), sc=(1, 1, 0.85))
    if "guitar" in f["accessory"]:
        wood = "#E8742A"
        gm = Matrix.Translation(Vector((0.06, torso_y - 0.2, 0.42))) @ Matrix.Rotation(-0.55, 4, "Z")
        place = lambda v: tuple(gm @ Vector(v))
        gprof = [(0.0, -0.36), (0.16, -0.355), (0.28, -0.3), (0.34, -0.18), (0.31, -0.07), (0.21, 0.0), (0.2, 0.07), (0.25, 0.15), (0.27, 0.25), (0.2, 0.33), (0.1, 0.36), (0.0, 0.365)]
        gb = lathe(gprof, 40)
        gb.verts = [(x, y, z * 0.3) for x, y, z in gb.verts]
        B.add(gb, wood, place((0, 0, 0)), rotmat=gm.to_quaternion().to_matrix().to_4x4())
        B.add(cylinder(0.075, 0.075, 0.03, 24), "#2B2B33", place((0, -0.12, 0.095)), rotmat=(gm.to_quaternion().to_matrix().to_4x4() @ Matrix.Rotation(math.pi / 2, 4, "X")))
        B.add(rbox(0.16, 0.035, 0.04, 0.012, seg=2, sub=0), "#4A2E1A", place((0, -0.27, 0.095)), rotmat=gm.to_quaternion().to_matrix().to_4x4())
        B.add(rbox(0.09, 0.72, 0.05, 0.02), "#4A2E1A", place((0, 0.68, 0.01)), rotmat=gm.to_quaternion().to_matrix().to_4x4())
        B.add(rbox(0.15, 0.24, 0.06, 0.03), "#2B2B33", place((0, 1.12, 0.0)), rotmat=gm.to_quaternion().to_matrix().to_4x4())
        B.add(rbox(1.0, 0.06, 0.04, 0.015), "#1D2A44", (0, torso_y + 0.02, 0.31), rot=(0, 0, 0.78))
    body_ob = B.finish(root, figure_mat)

    # ---------------- Arms (pivot at the shoulder)
    bend, L = 0.32, 0.3
    u = Vector((0, -math.cos(bend), math.sin(bend)))
    E = Vector((0, -0.31, 0))
    W = E + u * L
    mid = E + u * L / 2
    hand = W + u * 0.12

    def arm_role(side, col_sleeve, cuff, name, extra=1.0):
        A = Role(name)
        A.add(sphere(0.16 * extra, 0.16 * extra, 0.16 * extra, 28, 16), col_sleeve)
        limb = tube([(0, 0, 0), (0, -0.16, 0), tuple(E), tuple(mid), tuple(W)], lambda t: (0.135 - 0.03 * t - 0.012 * math.sin(math.pi * t * 2) ** 2) * extra, 28, 20)
        A.add(limb, col_sleeve)
        A.add(cylinder(0.13 * extra, 0.135 * extra, 0.06, 24), cuff, tuple(W - u * 0.025), rot=(-bend, 0, 0))
        return A

    arms = {}
    for side, sx in (("L", -1), ("R", 1)):
        piv = empty("Arm" + side, root, (sx * 0.66, shoulder_y, 0))
        A = arm_role(side, body_c, lighten(body_c, 0.35), "ArmMesh" + side)
        hs, sweep = c_hand(0.13, 0.075)
        gap = sweep + (TAU - sweep) / 2
        hm = Matrix.Rotation(-bend, 4, "X") @ Matrix.Rotation(math.pi / 2, 4, "Y") @ Matrix.Rotation(math.pi - gap, 4, "Z")
        # bake the hand's own orientation into its verts, then place it
        hs.verts = [tuple(hm @ Vector(v)) for v in hs.verts]
        A.add(hs, skin, (hand.x, hand.y - 0.1, hand.z + 0.02))
        for a in (0.0, sweep):
            tip = sphere(0.075, 0.075, 0.075, 16, 10)
            c = hm @ Vector((0.13 * math.cos(a), 0.13 * math.sin(a), 0))
            A.add(tip, skin, (hand.x + c.x, hand.y - 0.1 + c.y, hand.z + 0.02 + c.z))
        A.finish(piv, figure_mat)
        arms[side] = piv

    # ---------------- Head (pivot at the head centre)
    head = empty("Head", root, (0, head_y, 0))
    Hd = Role("HeadMesh")
    Hd.add(head_shape(HEAD), skin)
    for sx in (-1, 1):
        Hd.add(capsule(0.075, 0.07, 14, 4), skin, (sx * 0.5, -0.04, 0), sc=(0.7, 1, 1))
    Hd.add(cylinder(0.1, 0.085, 0.05, 20), skin, (0, top + 0.012, 0))
    style = f["hairStyle"]
    lock = lambda x, y, z, ln, r, rot, c=hc, sc=(1, 1, 1): Hd.add(capsule(r, ln, 12, 3), c, (x, y, z), rot=rot, sc=sc)

    def hl(front, side, back):
        return lambda phi: front + (side - front) * smoothstep(0.75, 1.5, abs(phi)) + (back - side) * smoothstep(1.9, 2.7, abs(phi))

    def glasses_up(y, z):
        for sx in (-1, 1):
            Hd.add(sphere(0.17, 0.045, 0.11, 20, 10), "#1D2A44", (sx * 0.19, y, z + 0.1), rot=(-0.25, 0, 0))
            Hd.add(capsule(0.012, 0.42, 8, 2), "#2B2B33", (sx * 0.3, y - 0.01, z - 0.14), rot=(math.pi / 2 - 0.25, 0, 0))
        Hd.add(rbox(0.16, 0.03, 0.03, 0.012), "#2B2B33", (0, y, z + 0.11))

    if style == "bald":
        Hd.add(sphere(0.13, 0.04, 0.09, 16, 8), lighten(skin, 0.28), (0.13, top - 0.035, 0.16), rot=(0.3, 0, -0.3))
        Hd.add(jaw_shell(HEAD, -0.5, -0.33, 1.3, 0.04), hc)
        Hd.add(sphere(0.1, 0.04, 0.07, 18, 10), mix(hc, "#9AA0A6", 0.45), (0, -0.47, 0.38), rot=(0.25, 0, 0))
    elif style == "wavy-short":
        Hd.add(hair_cap(HEAD, hl(0.27, 0.03, -0.14), 0.035, 0.05, (0.012, 6, 14)), hc)
        for x, z, r in [(-0.2, -0.05, 0.3), (0.15, 0.0, -0.2), (0.0, -0.22, 0.1), (0.3, -0.15, -0.4)]:
            lock(x, top + 0.02, z, 0.1, 0.085, (0.4, 0, r), hcl)
        Hd.add(torus(0.04, 0.012, TAU, 16, 6), "#FFD60A", (-0.51, -0.12, 0.04), rot=(0, math.pi / 2, 0))
        glasses_up(top + 0.08, -0.05)
    elif style == "long-straight":
        Hd.add(hair_cap(HEAD, hl(0.25, -0.3, -0.34), 0.04, 0.055, (0.008, 5, 9)), hc)
        Hd.add(rbox(0.98, 1.5, 0.2, 0.09, taper=0.86), hc, (0, -0.36, -0.4))
        for sx in (-1, 1):
            lock(sx * 0.53, -0.5, 0.0, 0.75, 0.085, (0.05, 0, sx * 0.06))
        glasses_up(top + 0.07, 0.0)
    elif style == "curly-fluffy":
        Hd.add(hair_cap(HEAD, hl(0.22, 0.02, -0.1), 0.05, 0.085, (0.035, 9, 17)), hc)

        def curl(x, y, z, r, c=hc):
            Hd.add(sphere(r, r * 0.95, r, 18, 10), c, (x, y, z))

        for i in range(8):
            an = TAU * i / 8
            curl(math.cos(an) * 0.3, top, math.sin(an) * 0.28 - 0.03, 0.17, hcl if i % 3 == 0 else hc)
        for x, z in [(0.0, 0.04), (0.14, -0.1), (-0.14, -0.1)]:
            curl(x, top + 0.07, z, 0.17, hcl)
        for sx in (-1, 1):
            curl(sx * 0.44, 0.25, 0.0, 0.13)
            curl(sx * 0.46, 0.05, -0.1, 0.12)
            curl(sx * 0.3, 0.3, 0.3, 0.1)
        for i in range(4):
            curl(-0.24 + i * 0.16, 0.27, 0.32 - abs(i - 1.5) * 0.04, 0.09)
        curl(0, 0.05, -0.42, 0.2)
    else:  # wavy-pulled-back (Luna): cap, bun, scrunchie
        Hd.add(hair_cap(HEAD, hl(0.25, 0.1, -0.2), 0.032, 0.05, (0.01, 6, 12)), hc)
        Hd.add(sphere(0.2, 0.19, 0.2, 24, 14), hcl, (0, top + 0.1, -0.26))
        Hd.add(torus(0.13, 0.035, TAU, 24, 8), "#FF5CA8", (0, top + 0.04, -0.24), rot=(math.pi / 2 - 0.5, 0, 0))
        # tiara
        tilt = -0.38
        Hd.add(tiara_band(), "#E4ECF9", (0, 0.1, 0.13), rot=(tilt, 0, 0))
        for i in range(5):
            an = math.pi / 2 + ((i - 2) / 2.0) * (1.1 - 0.2)
            big = 1 - abs(i - 2) * 0.22
            x, y = math.cos(an) * 0.4, math.sin(an) * 0.4 + 0.07 * big
            c, s_ = math.cos(tilt), math.sin(tilt)
            Hd.add(cone(0.04, 0.16 * big + 0.04, 12), "#E4ECF9", (x, 0.1 + y * c, 0.13 + y * s_), rot=(tilt, 0, an - math.pi / 2))
        Hd.add(sphere(0.05, 0.05, 0.04, 14, 8), "#FF3E96", (0, 0.1 + 0.41 * math.cos(tilt), 0.13 + 0.41 * math.sin(tilt) + 0.015))
    if f["accessory"] == "visor":
        visor_parts(Hd, "#E63946")
    Hd.finish(head, figure_mat)
    fp = Role("FacePlate")
    fp.add(plate_shape(HEAD, SPEC["plate"]["yLo"], SPEC["plate"]["yHi"], SPEC["plate"]["arc"]), skin)
    fp_ob = fp.finish(head, plate_mat)

    # ---------------- Luna's closet: garments as separate named, toggleable meshes
    if fid == "luna":
        closet_items(root, head, arms, figure_mat, dict(base=base, torso_h=torso_h, torso_y=torso_y, head_y=head_y, top=top, body_c=body_c, skin=skin, shoulder_y=shoulder_y, W=W, u=u, bend=bend, r_at=r_at))


def tiara_band():
    t = torus(0.4, 0.026, math.radians(126), 40, 6)
    a = math.radians(126)
    rz = Matrix.Rotation(math.pi / 2 - a / 2, 4, "Z")
    t.verts = [tuple(rz @ Vector(v)) for v in t.verts]
    t.closed = False
    return t


def beard_verts(verts, arc, depth):
    """Torus -> flat jaw band: lay it in XZ, centre the arc on +z, z-scale like the head, rough the edge a little."""
    rx = Matrix.Rotation(math.pi / 2, 4, "X")
    pts = [rx @ Vector(v) for v in verts]
    cx = sum(p.x for p in pts) / len(pts)
    cz = sum(p.z for p in pts) / len(pts)
    ry = Matrix.Rotation(-math.atan2(cx, cz), 4, "Y")
    out = []
    for p in pts:
        q = ry @ p
        n = math.sin(q.x * 61.7 + q.z * 37.1 + q.y * 23.3) * 0.5 + math.sin(q.x * 29.3 - q.z * 51.9) * 0.5
        k = 1 + n * 0.12
        out.append((q.x * k, q.y * (1 + n * 0.08), q.z * k * depth))
    return out


def visor_parts(R, brim):
    prof = head_profile(HEAD, 2.0)
    lo, hi, thick = 0.2, 0.37, 0.05
    rlo, rhi = profile_radius(prof, lo), profile_radius(prof, hi)
    band = lathe([(rlo + thick, lo), (rhi + thick, hi), (rhi + 0.004, hi), (rlo + 0.004, lo)], 48, zs=HEAD["depth"])
    R.add(band, "#FFFFFF")
    r0 = profile_radius(prof, hi) + 0.05
    reach, th = 0.34, 0.035
    brim_profile = [(r0 - 0.04, -th), (r0 + reach, -0.05 - th), (r0 + reach + 0.015, -0.05 - th * 0.5), (r0 + reach, -0.05), (r0 - 0.04, 0.0)]
    R.add(lathe(brim_profile, 24, -0.75, 1.5), brim, (0, 0.34, 0), rot=(0.1, 0, 0), sc=(1, 1, HEAD["depth"]))


def closet_items(root, head, arms, mat, d):
    base, torso_h, torso_y, head_y, top = d["base"], d["torso_h"], d["torso_y"], d["head_y"], d["top"]

    def skirt(waist_r, hem_r, height, thick, zs):
        h = height
        pts = [(hem_r - thick, -h / 2 + 0.02), (hem_r - thick * 0.5, -h / 2 - 0.025), (hem_r + 0.01, -h / 2), (hem_r, -h / 2 + 0.04),
               (waist_r + (hem_r - waist_r) * 0.75, -h * 0.3), (waist_r + (hem_r - waist_r) * 0.3, h * 0.15), (waist_r, h / 2), (0.0, h / 2),
               (0.0, h / 2 - 0.04), (waist_r - thick, h / 2 - 0.04)]
        # closed loop: bottom of the inner wall -> hem -> up the outer wall -> across the top -> down the inner wall
        pts = [(hem_r - thick, -h / 2 + 0.02), (hem_r - thick * 0.5, -h / 2 - 0.025), (hem_r + 0.01, -h / 2), (hem_r, -h / 2 + 0.04),
               (waist_r + (hem_r - waist_r) * 0.75, -h * 0.3), (waist_r + (hem_r - waist_r) * 0.3, h * 0.15), (waist_r, h / 2),
               (waist_r - thick, h / 2 - 0.0)]
        sh = lathe(pts, 48, zs=zs)
        sh.closed = False
        return sh

    def item(name, parent, role_fn):
        R = Role(name)
        role_fn(R)
        return R.finish(parent, mat)

    # dress
    def dress(R):
        R.add(skirt(0.4, 0.66, 0.42, 0.045, 0.78), "#FF9CCB", (0, base - 0.03, 0))
        for i in range(8):
            an = TAU * i / 8
            R.add(sphere(0.04, 0.04, 0.04, 10, 6), "#FFFFFF", (math.sin(an) * 0.6, base - 0.2, math.cos(an) * 0.6 * 0.78))
        R.add(torus(0.39, 0.03, TAU, 32, 8), "#FFC4E0", (0, base + 0.08, 0), rot=(math.pi / 2, 0, 0), sc=(1, 1, 0.8))
        R.add(rbox(1.04, 0.84, 0.62, 0.17, taper=0.8, seg=5), "#FF9CCB", (0, torso_y, 0))
    item("Item_dress", root, dress)

    def cape(R):
        top0 = base + torso_h - 0.02
        half, top_r, hem_r, height, thick, zs = 1.15, 0.5, 0.74, 1.0, 0.04, 0.95
        pts = [(hem_r - thick, -height / 2), (hem_r, -height / 2), (top_r + (hem_r - top_r) * 0.4, height * 0.1), (top_r, height / 2), (top_r - thick, height / 2),
               (top_r + (hem_r - top_r) * 0.4 - thick, height * 0.1)]
        sh = lathe(pts, 24, math.pi - half, half * 2, zs=zs)
        sh.closed = False
        R.add(sh, "#7B4BC4", (0, top0 - 0.5, -0.02))
        for x, y, s in [(-0.2, -0.2, 0.1), (0.22, -0.45, 0.08), (0.02, -0.7, 0.07)]:
            R.add(star_shape(s), "#FFD60A", (x, top0 + y, -0.02 - (0.5 + 0.24 * -y) * 0.95 - 0.03), rot=(0, math.pi, 0))
        R.add(sphere(0.05, 0.05, 0.04, 12, 8), "#FFD60A", (0, top0 - 0.02, 0.18))
    item("Item_cape", root, cape)

    def coat(R):
        R.add(rbox(1.1, torso_h + 0.04, 0.8, 0.2, taper=0.84, seg=5), "#FFFFFF", (0, torso_y, 0))
        R.add(skirt(0.42, 0.78, 0.5, 0.04, 0.82), "#FFFFFF", (0, base - 0.12, 0))
        R.add(rbox(0.07, torso_h + 0.3, 0.035, 0.015), "#BFD7FF", (0, torso_y - 0.02, 0.4))
        for sx in (-1, 1):
            R.add(rbox(0.2, 0.3, 0.045, 0.03), "#F2F7FF", (sx * 0.2, torso_y + 0.32, 0.4), rot=(0, 0, sx * -0.55))
            R.add(rbox(0.26, 0.2, 0.035, 0.03), "#DCEBFF", (sx * 0.3, torso_y - 0.25, 0.405))
        for i in range(3):
            R.add(sphere(0.04, 0.04, 0.025, 10, 6), "#3A86FF", (0, torso_y + 0.15 - i * 0.2, 0.43))
    item("Item_labcoat", root, coat)

    def boots(R):
        for sx in (-1, 1):
            R.add(foot_shape(0.34), "#E63946", (sx * 0.2, 0.0, -0.02), sc=(1.0, 1.25, 1.1))
            R.add(foot_shape(0.35), "#A3222F", (sx * 0.2, -0.015, -0.02), sc=(1.0, 0.2, 1.12))
            R.add(rbox(0.34, 0.38, 0.36, 0.12, taper=0.95), "#E63946", (sx * 0.2, 0.34, -0.01))
            R.add(torus(0.16, 0.03, TAU, 24, 8), "#FFD6DA", (sx * 0.2, 0.5, -0.01), rot=(math.pi / 2, 0, 0))
    item("Item_boots", root, boots)

    # sleeves overlay the arms
    for side in "LR":
        for name, col, cuff in (("labcoat", "#FFFFFF", "#BFD7FF"), ("dress", "#FF9CCB", "#FFC4E0")):
            R = Role("Item_%s__sleeve%s" % (name, side))
            E = Vector((0, -0.31, 0))
            bend, L = d["bend"], 0.3
            u = d["u"]
            mid = E + u * L / 2
            W = d["W"]
            R.add(sphere(0.175, 0.175, 0.175, 24, 14), col)
            R.add(tube([(0, 0, 0), (0, -0.16, 0), tuple(E), tuple(mid), tuple(W)], lambda t: 0.148 - 0.03 * t, 24, 20), col)
            R.add(cylinder(0.14, 0.145, 0.06, 24), cuff, tuple(W - u * 0.025), rot=(-bend, 0, 0))
            R.finish(arms[side], mat)

    # head items
    def bow(R):
        bx, by, bz = 0.28, top + 0.09, 0.16
        for sx in (-1, 1):
            R.add(sphere(0.15, 0.12, 0.07, 20, 12), "#FF3E96", (bx + sx * 0.15, by, bz), rot=(0.2, 0, sx * 0.35))
        R.add(sphere(0.07, 0.07, 0.06, 14, 8), "#C41F72", (bx, by, bz + 0.01))
    item("Item_bow", head, bow)
    item("Item_visor", head, lambda R: visor_parts(R, "#FF5CA8"))

    def sun(R):
        zf = d["r_at"](0.04) * HEAD["depth"] + 0.05
        for sx in (-1, 1):
            R.add(star_shape(0.12), "#3A86FF", (sx * 0.2, 0.045, zf))
            a, b = Vector((sx * 0.31, 0.05, zf - 0.02)), Vector((sx * 0.5, 0.05, 0.02))
            R.add(capsule(0.014, (b - a).length, 8, 2), "#1D2A44", tuple((a + b) / 2), rotmat=Vector((0, 1, 0)).rotation_difference((b - a).normalized()).to_matrix().to_4x4())
        R.add(rbox(0.12, 0.03, 0.03, 0.012), "#1D2A44", (0, 0.05, zf))
    item("Item_sunglasses", head, sun)


def star_shape(radius, depth=0.05):
    poly = []
    for i in range(10):
        a = TAU * i / 10 + math.pi / 2
        r = 1.0 if i % 2 == 0 else 0.45
        poly.append((math.cos(a) * r * radius, math.sin(a) * r * radius))
    return prism(poly, depth, bevel=0.012, bseg=2, sub=0)


# ----------------------------------------------------------------------------- pets
def pet_parts(fid, f, root, mats):
    figure_mat, plate_mat = mats
    skin = f["bodyColor"]
    body_c, out_c = f["bodyColor"], f["outfitColor"]
    hy, hz = f["headY"], f["headZ"]
    spec = dict(HEAD, r=f["headR"], h=f["headH"], depth=f["headDepth"], bevel=0.29, topBevel=0.3, cheek=0.02 if f["species"] == "dog" else 0.035, cheekY=-0.1)
    prof = head_profile(spec, 2.0)
    plate_z = lambda y: profile_radius(prof, y) * spec["depth"]
    dog = f["species"] == "dog"
    dark = darken(body_c, 0.28)
    patch = "#8A5A2B"

    B = Role("Body")
    if dog:
        B.add(capsule(0.33, 0.5, 28, 8), body_c, (0, 0.55, -0.05), rot=(math.pi / 2, 0, 0))
        for sx in (-1, 1):
            B.add(sphere(0.2, 0.25, 0.26, 20, 12), body_c, (sx * 0.2, 0.52, -0.42))
        B.add(capsule(0.24, 0.2, 20, 5), body_c, (0, 0.76, 0.34), rot=(0.6, 0, 0))
        B.add(torus(0.22, 0.075, TAU, 28, 10), out_c, (0, 0.74, 0.36), rot=(-1.0, 0, 0), sc=(1.05, 1.2, 1))
        for sx in (-1, 1):
            for sz in (0.3, -0.4):
                B.add(capsule(0.1, 0.1, 14, 4), dark, (sx * 0.2, 0.19, sz))
                B.add(sphere(0.12, 0.07, 0.16, 14, 8), out_c, (sx * 0.2, 0.06, sz + 0.04))
        B.add(torus(0.235, 0.032, TAU, 28, 8), "#3A86FF", (0, 0.78, 0.4), rot=(-1.0, 0, 0), sc=(1, 1.05, 1))
        B.add(cylinder(0.06, 0.06, 0.02, 16), "#FFD60A", (0, 0.62, 0.62), rot=(math.pi / 2 - 0.3, 0, 0))
    else:
        B.add(capsule(0.27, 0.4, 28, 8), body_c, (0, 0.5, -0.05), rot=(math.pi / 2, 0, 0))
        for sx in (-1, 1):
            B.add(sphere(0.17, 0.2, 0.22, 18, 10), patch if sx > 0 else body_c, (sx * 0.17, 0.46, -0.3))
        B.add(capsule(0.2, 0.15, 18, 5), body_c, (0, 0.7, 0.26), rot=(0.55, 0, 0))
        B.add(torus(0.18, 0.09, TAU, 28, 10), body_c, (0, 0.76, 0.33), rot=(-1.0, 0, 0), sc=(1.1, 1.2, 1))
        for sx in (-1, 1):
            for sz in (0.2, -0.3):
                B.add(capsule(0.085, 0.08, 14, 4), patch if sx > 0 else body_c, (sx * 0.16, 0.17, sz))
                B.add(sphere(0.095, 0.06, 0.12, 14, 8), "#E8A0B4", (sx * 0.16, 0.055, sz + 0.03))
        B.add(torus(0.2, 0.03, TAU, 28, 8), "#FF5CA8", (0, 0.73, 0.32), rot=(-1.0, 0, 0), sc=(1, 1.1, 1))
        B.add(sphere(0.065, 0.065, 0.065, 14, 10), "#FFD60A", (0, 0.58, 0.52))
        B.add(rbox(0.07, 0.012, 0.012, 0.004, seg=2, sub=0), "#A07A00", (0, 0.55, 0.575))
    B.finish(root, figure_mat)

    head = empty("Head", root, (0, hy, hz))
    Hd = Role("HeadMesh")
    Hd.add(head_shape(spec, 56), body_c)
    if dog:
        for sx in (-1, 1):
            Hd.add(cone_soft(0.15, 0.3, 20), dark, (sx * 0.25, 0.4, -0.04), rot=(0, 0, -sx * 0.25), sc=(1, 1, 0.65))
            Hd.add(cone_soft(0.072, 0.14, 16), "#2B2B33", (sx * 0.3, 0.5, -0.04), rot=(0, 0, -sx * 0.25), sc=(1, 1, 0.65))
    else:
        for sx in (-1, 1):
            Hd.add(sphere(0.12, 0.13, 0.2, 18, 10), body_c, (sx * 0.3, -0.12, 0.0), rot=(0, sx * 0.3, 0))
            Hd.add(cone(0.15, 0.34, 16), patch if sx > 0 else body_c, (sx * 0.22, 0.4, -0.02), rot=(0, 0, -sx * 0.2), sc=(1, 1, 0.6))
            Hd.add(cone(0.09, 0.22, 12), "#F28AA6", (sx * 0.22, 0.37, 0.02), rot=(0, 0, -sx * 0.2), sc=(1, 1, 0.5))
        for sx in (-1, 1):
            for i in range(3):
                y0 = -0.06 - i * 0.04
                w = tube([(0, 0, 0), (sx * 0.14, 0.02 - i * 0.012, 0.0), (sx * 0.3, 0.015 - i * 0.03, -0.03)], lambda t: 0.006 - 0.0035 * t, 12, 6)
                Hd.add(w, "#CFC8BE", (sx * 0.12, y0, plate_z(-0.1) + 0.02))
    Hd.finish(head, figure_mat)
    top = hy + f["headH"] / 2 + 0.1
    hat = Role("Item_pethats")
    hat.add(cone(0.2, 0.5, 20), "#FF5CA8", (0, top - hy + 0.14, -0.05), rot=(0.15, 0, 0.1))
    hat.add(torus(0.18, 0.035, TAU, 24, 8), "#FFFFFF", (0, top - hy - 0.1, -0.045), rot=(math.pi / 2 + 0.15, 0, 0.1))
    hat.add(sphere(0.08, 0.08, 0.08, 14, 8), "#FFD60A", (0.05, top - hy + 0.4, -0.1))
    hat.finish(head, figure_mat)
    fp = Role("FacePlate")
    pd = f["plateH"]
    # the portrait bulges where the muzzle / cheeks are, with a body-coloured volume behind it
    bumps = [(0.5, 0.36, 0.2, 0.2, 0.09)] if dog else [(0.5, 0.3, 0.16, 0.16, 0.05), (0.33, 0.3, 0.12, 0.14, 0.035), (0.67, 0.3, 0.12, 0.14, 0.035)]
    fp.add(plate_shape(spec, -0.02 - pd / 2, -0.02 + pd / 2, f["plateW"], bumps=bumps), skin)
    my = -0.02 - pd / 2 + pd * 0.34
    mz = plate_z(my) + (0.0 if dog else -0.01)
    Hm = Role("HeadMuzzle")
    if dog:
        Hm.add(sphere(0.15, 0.11, 0.12, 24, 14), out_c, (0, my, mz - 0.07))
    else:
        for sx in (-1, 0, 1):
            Hm.add(sphere(0.09, 0.07, 0.07, 20, 12), body_c, (sx * 0.1, my, mz - 0.05))
    Hm.finish(head, figure_mat)
    fp.finish(head, plate_mat)

    tail_pivot = (0, 0.7, -0.5) if dog else (0, 0.55, -0.4)
    tail = empty("Tail", root, tail_pivot)
    T = Role("TailMesh")
    if dog:
        T.add(tube([(0, 0, 0), (0, 0.1, -0.1), (0, 0.26, -0.13), (0, 0.4, -0.04), (0, 0.42, 0.12), (0, 0.31, 0.22)], lambda t: 0.09 + 0.07 * math.sin(math.pi * min(1, t * 1.1)) - 0.02 * t, 32, 14), body_c)
        T.add(sphere(0.08, 0.08, 0.08, 14, 8), out_c, (0, 0.31, 0.22))
    else:
        T.add(tube([(0, 0, 0), (0, 0.16, -0.08), (0, 0.36, -0.12), (0, 0.56, -0.1), (0, 0.74, -0.02)], lambda t: 0.07 + 0.13 * math.sin(math.pi * min(1, t * 0.9 + 0.1)), 32, 14), body_c)
        T.add(sphere(0.09, 0.1, 0.09, 14, 8), patch, (0, 0.75, -0.02))
    T.finish(tail, figure_mat)


# ----------------------------------------------------------------------------- driver
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export(root, path):
    bpy.ops.object.select_all(action="DESELECT")
    stack = [root]
    while stack:
        o = stack.pop()
        o.select_set(True)
        stack.extend(o.children)
    bpy.context.view_layer.objects.active = root
    kw = dict(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=False,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=True,
        export_vertex_color="NAME",
        export_vertex_color_name="Col",
        export_all_vertex_colors=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=13,
        export_draco_normal_quantization=9,
        export_draco_texcoord_quantization=11,
        export_draco_color_quantization=8,
    )
    props = bpy.ops.export_scene.gltf.get_rna_type().properties
    kw = {k: v for k, v in kw.items() if k in props}
    bpy.ops.export_scene.gltf(**kw)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = os.path.join(ROOT, "public", "models")
    only = None
    i = 0
    while i < len(argv):
        if argv[i] == "--out":
            out = os.path.abspath(argv[i + 1])
            i += 2
        elif argv[i] == "--only":
            only = set(argv[i + 1].split(","))
            i += 2
        else:
            i += 1
    os.makedirs(out, exist_ok=True)
    for fid, f in SPEC["figures"].items():
        if only and fid not in only:
            continue
        reset_scene()
        skin = f.get("skinTone", f["bodyColor"])
        mats = make_materials(skin)
        root = bpy.data.objects.new("Figure_" + fid, None)
        bpy.context.scene.collection.objects.link(root)
        (person_parts if f["kind"] == "person" else pet_parts)(fid, f, root, mats)
        path = os.path.join(out, fid + ".glb")
        export(root, path)
        tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
        print("EXPORTED %s -> %s (%d bytes, ~%d polys)" % (fid, path, os.path.getsize(path), tris))


main()
