import os
import re
from pathlib import Path

def generate_project_graph(base_dir: str):
    nodes = []
    edges = []
    node_ids = set()

    frontend_src = os.path.join(base_dir, "frontend", "src")
    backend_src = os.path.join(base_dir, "backend")

    def add_node(file_path: Path, node_type: str):
        try:
            rel_path = file_path.relative_to(base_dir).as_posix()
        except ValueError:
            rel_path = file_path.name
        
        node_id = rel_path.lower().replace("/", "_").replace(".", "_").replace(":", "_")
        if node_id not in node_ids:
            nodes.append({
                "id": node_id,
                "label": file_path.name,
                "type": node_type,
                "path": rel_path
            })
            node_ids.add(node_id)
        return node_id

    # ── Scan Frontend files (.ts, .tsx) ───────────────────────────────
    if os.path.exists(frontend_src):
        for root, _, files in os.walk(frontend_src):
            for file in files:
                if file.endswith((".ts", ".tsx")) and not file.endswith(".d.ts"):
                    fp = Path(root) / file
                    
                    # Identify category
                    n_type = "general"
                    if "pages" in root.lower():
                        n_type = "ui"
                    elif "components" in root.lower():
                        n_type = "ui"
                    elif "contexts" in root.lower():
                        n_type = "auth"
                    elif "api" in root.lower():
                        n_type = "service"
                    elif "tools" in root.lower():
                        n_type = "service"
                    elif "hooks" in root.lower():
                        n_type = "general"

                    src_id = add_node(fp, n_type)

                    try:
                        content = fp.read_text(encoding="utf-8", errors="ignore")
                        # Match imports like: from './...' or from '../...'
                        matches = re.findall(r'from\s+[\'"]([.\/][^\'"]+)[\'"]', content)
                        for import_path in matches:
                            resolved_dir = fp.parent
                            import_target = (resolved_dir / import_path).resolve()
                            
                            target_file = None
                            # Try matching common React module resolutions
                            for ext in [".tsx", ".ts", "/index.tsx", "/index.ts"]:
                                test_path = Path(str(import_target) + ext)
                                if test_path.exists():
                                    target_file = test_path
                                    break
                            
                            if not target_file and import_target.exists() and import_target.is_file():
                                target_file = import_target

                            if target_file:
                                trg_type = "general"
                                if "pages" in str(target_file).lower() or "components" in str(target_file).lower():
                                    trg_type = "ui"
                                elif "contexts" in str(target_file).lower():
                                    trg_type = "auth"
                                elif "api" in str(target_file).lower():
                                    trg_type = "service"

                                trg_id = add_node(target_file, trg_type)
                                edges.append({
                                    "source": src_id,
                                    "target": trg_id,
                                    "label": "imports"
                                })
                    except Exception:
                        pass

    # ── Scan Backend files (.py) ──────────────────────────────────────
    if os.path.exists(backend_src):
        for root, _, files in os.walk(backend_src):
            # Skip virtualenv directories if nested
            if "venv" in root or "__pycache__" in root:
                continue
            for file in files:
                if file.endswith(".py") and file != "__init__.py":
                    fp = Path(root) / file
                    
                    n_type = "service"
                    if "routes" in root.lower():
                        n_type = "ui"
                    elif "models" in root.lower() or "database" in root.lower():
                        n_type = "database"

                    src_id = add_node(fp, n_type)

                    try:
                        content = fp.read_text(encoding="utf-8", errors="ignore")
                        # Match python imports: "from x import y" or "import x"
                        import_lines = re.findall(r'^(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.]+))', content, re.MULTILINE)
                        for from_pkg, imp_pkg in import_lines:
                            pkg = from_pkg or imp_pkg
                            pkg_parts = pkg.split(".")
                            
                            # Test if package resolves to a local file/folder
                            test_paths = [
                                Path(backend_src) / f"{pkg_parts[0]}.py",
                                Path(backend_src) / "/".join(pkg_parts) / "__init__.py",
                                Path(backend_src) / "/".join(pkg_parts) / f"{pkg_parts[-1]}.py",
                            ]
                            for tp in test_paths:
                                if tp.exists() and tp.is_file():
                                    trg_type = "service"
                                    if "routes" in str(tp).lower():
                                        trg_type = "ui"
                                    elif "models" in str(tp).lower() or "database" in str(tp).lower():
                                        trg_type = "database"
                                    
                                    trg_id = add_node(tp, trg_type)
                                    edges.append({
                                        "source": src_id,
                                        "target": trg_id,
                                        "label": "imports"
                                    })
                                    break
                    except Exception:
                        pass

    return {"nodes": nodes, "edges": edges}
