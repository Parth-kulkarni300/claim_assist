# Graph Report - claim-assist  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 191 nodes · 324 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e66bd78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- analyze_damage
- package.json
- App.tsx
- app.py
- estimate_claim
- test_app.py
- compilerOptions
- main.py

## God Nodes (most connected - your core abstractions)
1. `analyze_damage()` - 25 edges
2. `estimate_claim()` - 17 edges
3. `TestAnalyzeDamage` - 13 edges
4. `compilerOptions` - 12 edges
5. `_make_response()` - 9 edges
6. `InsurerDashboard()` - 8 edges
7. `submit_claim()` - 8 edges
8. `Claim` - 7 edges
9. `formatINR()` - 7 edges
10. `load_claims()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `submit_claim()` --calls--> `analyze_damage()`  [EXTRACTED]
  app.py → src/vision.py
- `main()` --calls--> `analyze_damage()`  [EXTRACTED]
  main.py → src/vision.py
- `submit_claim()` --calls--> `estimate_claim()`  [EXTRACTED]
  app.py → src/pricing.py
- `main()` --calls--> `estimate_claim()`  [EXTRACTED]
  main.py → src/pricing.py
- `test_blurry_photo_requires_review()` --calls--> `estimate_claim()`  [EXTRACTED]
  tests/test_pricing.py → src/pricing.py

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 0 - "analyze_damage"
Cohesion: 0.07
Nodes (7): analyze_damage(), encode_image(), _heuristic_damage_fallback(), _safe_fallback(), _validate_vision_result(), _make_response(), TestAnalyzeDamage

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (28): dependencies, canvas-confetti, lucide-react, react, react-dom, @types/react, @types/react-dom, @vitejs/plugin-react (+20 more)

### Community 2 - "App.tsx"
Cohesion: 0.18
Nodes (20): approveClaim(), formatDate(), formatINR(), getClaims(), rejectClaim(), submitClaim(), App(), ToastItem (+12 more)

### Community 3 - "app.py"
Cohesion: 0.15
Nodes (14): allowed_file(), approve_claim(), customer_dashboard(), get_all_claims(), get_claim(), index(), insurer_dashboard(), load_claims() (+6 more)

### Community 4 - "estimate_claim"
Cohesion: 0.16
Nodes (11): estimate_claim(), load_prices(), normalize_damage_type(), normalize_part(), test_blurry_photo_requires_review(), test_damage_type_synonyms_lookup(), test_known_damage_estimate(), test_negative_deductible_raises() (+3 more)

### Community 6 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 7 - "main.py"
Cohesion: 0.43
Nodes (3): main(), generate_report(), test_report_shows_human_review()

## Knowledge Gaps
- **4 isolated node(s):** `@types/canvas-confetti`, `@types/react`, `@types/react-dom`, `typescript`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 86 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `analyze_damage()` connect `analyze_damage` to `app.py`, `main.py`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **What connects `@types/canvas-confetti`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `analyze_damage` be split into smaller, more focused modules?**
  _Cohesion score 0.0707070707070707 - nodes in this community are weakly interconnected._
- **Why does `estimate_claim()` connect `estimate_claim` to `app.py`, `main.py`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `test_app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._