import fs from 'fs';
let code = fs.readFileSync('src/components/EditTransactionModal.tsx', 'utf-8');

const target = `  const amountInputRef = useRef<HTMLInputElement>(null);`;
const replacement = `  const amountInputRef = useRef<HTMLInputElement>(null);

  // Inline Camera State
  const [isInlineCameraActive, setIsInlineCameraActive] = useState(false);
  const [inlineStream, setInlineStream] = useState<MediaStream | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [inlineNewPhotoBlob, setInlineNewPhotoBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/EditTransactionModal.tsx', code);
