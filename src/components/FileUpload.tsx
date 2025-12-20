import React, { useRef } from "react";
import "./FileUpload.css";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  loading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  loading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div
      className="file-upload"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: "none" }}
      />

      {loading ? (
        <div className="upload-loading">
          <div className="spinner"></div>
          <p>Traitement du fichier en cours...</p>
        </div>
      ) : (
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <h3>Déposer votre fichier Excel</h3>
          <p>ou cliquez pour sélectionner</p>
          <p className="upload-hint">Formats supportés: .xlsx, .xls</p>
        </div>
      )}
    </div>
  );
};
