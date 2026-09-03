import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `  const handlePhotoCaptured = (blob: Blob) => {
    setCapturedPhotoBlob(blob);
    setIsCameraOpen(false);
    setIsNewTxOpen(true);
  };`;

const replace1 = `  const handlePhotoCaptured = (blob: Blob) => {
    setCapturedPhotoBlob(blob);
    setIsCameraOpen(false);
    
    // Only open the NewTransactionModal if we are NOT editing a transaction.
    // If we are editing, the EditTransactionModal is already open and waiting for the photo.
    if (!editingTransaction) {
      setIsNewTxOpen(true);
    }
  };`;

const target2 = `        <EditTransactionModal
          isOpen={!!editingTransaction}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onRequestChangePhoto={() => {
            setIsCameraOpen(true);
          }}
          newPhotoBlob={capturedPhotoBlob}
          onSuccess={handleEditTxSuccess}
        />`;

const replace2 = `        <EditTransactionModal
          isOpen={!!editingTransaction}
          transaction={editingTransaction}
          onClose={() => {
            setEditingTransaction(null);
            setCapturedPhotoBlob(null);
          }}
          onRequestChangePhoto={() => {
            setIsCameraOpen(true);
          }}
          newPhotoBlob={capturedPhotoBlob}
          onSuccess={() => {
            handleEditTxSuccess();
            setCapturedPhotoBlob(null);
          }}
        />`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replace1);
  code = code.replace(target2, replace2);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched App.tsx successfully");
} else {
  console.log("Targets not found in App.tsx");
}
