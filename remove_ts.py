import os
from pathlib import Path

changed = 0
for filepath in Path('src').rglob('*.ts*'):
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    new_lines = [line for line in lines if '@ts-expect-error' not in line]
    
    if len(lines) != len(new_lines):
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        changed += 1
        print("Removed from:", filepath)

print(f"Finished. Changed {changed} files.")
