import { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import "./UploadImage.css";

const UploadImage = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null); // Lưu tên file

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Xóa toàn bộ dữ liệu ảnh & kết quả
  const resetAll = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setImage(null);
    setPreview(null);
    setResults([]);
    setUploadedFileName(null); // Reset tên file
  };

  // Cập nhật ảnh mới và luôn xóa kết quả cũ
  const setNewImage = (file: File) => {
    resetAll();
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setUploadedFileName(file.name); // Lưu tên file
  };

  // Xử lý kéo & thả ảnh
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setNewImage(acceptedFiles[0]);
    }
  };

  // Cấu hình Dropzone
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
  });

  // Xử lý tải ảnh lên từ máy
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewImage(file);
    }
  };

  // Xử lý tải ảnh lên server
  const handleSubmit = async () => {
    if (!image) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      // Loại bỏ ảnh có tên trùng với ảnh vừa tải lên
      const filteredResults = data.similar_images.filter(
        (img: string) => !img.includes(uploadedFileName || "")
      );

      setResults(filteredResults);
    } catch (error) {
      console.error("Lỗi khi tải ảnh:", error);
    }

    setLoading(false);
  };

  // Mở camera
  const openCamera = async () => {
    resetAll(); // Xóa kết quả tìm kiếm khi mở camera
    setCameraOpen(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  // Chụp ảnh từ camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Tạo URL ảnh từ canvas
        const imageUrl = canvas.toDataURL("image/png");
        setPreview(imageUrl); // Cập nhật ảnh preview từ canvas

        // Tạo file để gửi lên server
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured_image.png", {
              type: "image/png",
            });
            setImage(file);
            setUploadedFileName(file.name);
          }
        }, "image/png");
      }
    }
    closeCamera();
  };

  // Đóng camera
  const closeCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraOpen(false);
  };

  return (
    <div className="p-5 max-w-lg mx-auto">
      {/* Kéo & Thả ảnh */}
      <div
        {...getRootProps()}
        className="relative flex items-center justify-center border-2 border-dashed border-gray-400 w-full h-64 text-center cursor-pointer overflow-hidden"
      >
        <input {...getInputProps()} onChange={handleFileUpload} />
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <p className="text-gray-500">
            Kéo & Thả ảnh vào đây hoặc nhấn để chọn ảnh
          </p>
        )}
      </div>

      {/* Nút mở camera */}
      <button
        onClick={openCamera}
        className="bg-green-500 text-white px-4 py-2 mt-3 w-full"
      >
        Mở Camera
      </button>

      {/* Hiển thị Camera */}
      {cameraOpen && (
        <div className="relative mt-3">
          <video ref={videoRef} autoPlay className="w-full"></video>
          <button
            onClick={capturePhoto}
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full"
          >
            Chụp Ảnh
          </button>
        </div>
      )}

      {/* Nút tải lên */}
      <button
        onClick={handleSubmit}
        className={`bg-blue-500 text-white px-4 py-2 mt-3 w-full ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={loading}
      >
        {loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
      </button>

      {/* Hiển thị ảnh kết quả */}
      <div className="grid grid-cols-4 gap-2 mt-5">
        {results.map((img, idx) => (
          <img
            key={idx}
            src={`http://localhost:8000${img}`}
            alt={`Kết quả ${idx + 1}`}
            className="w-32 h-32 object-cover"
          />
        ))}
      </div>

      {/* Canvas ẩn để chụp ảnh */}
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </div>
  );
};

export default UploadImage;
