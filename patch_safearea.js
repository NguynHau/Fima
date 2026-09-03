import fs from 'fs';
import path from 'path';

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let code = fs.readFileSync(filePath, 'utf-8');
  let originalCode = code;

  // 1. CameraCaptureModal:
  if (file === 'CameraCaptureModal.tsx') {
    code = code.replace(
      'className="relative z-20 flex items-center justify-between px-5 pt-4 pb-2 text-white"',
      'className="relative z-20 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top,0px),16px)] pb-2 text-white"'
    );
  }

  // 2. DayDetailModal.tsx photo viewer
  if (file === 'DayDetailModal.tsx') {
    code = code.replace(
      'className="fixed inset-0 z-70 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-200"',
      'className="fixed inset-0 z-70 bg-black/95 flex flex-col justify-between px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)] animate-in fade-in duration-200"'
    );
  }
  
  // 3. Modals with "p-4" on fixed inset-0
  code = code.replace(
    /className="fixed inset-0 z-([0-9]+) (.*?) p-4(.*?)"/g,
    'className="fixed inset-0 z-$1 $2 px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)]$3"'
  );

  if (code !== originalCode) {
    fs.writeFileSync(filePath, code);
    console.log(`Updated ${file}`);
  }
}
