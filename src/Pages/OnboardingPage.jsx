import { useContext, useState, useEffect } from "react";
import { UserContext } from "../Context/dataCont";
import Title from "../Components/Title";
import FileCard from "../Components/Cards/FileCrad";
import AddFileCard from "../Components/Cards/AddFileCard";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Image, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const { authData, setAuthData } = useContext(UserContext);
  const API_URL = import.meta.env.VITE_NEST_API_URL;
  const navigate = useNavigate();

  const [displayUser, setDisplayUser] = useState(authData.user);

  useEffect(() => {
    if (authData?.user) {
      setDisplayUser(authData.user);
    }
  }, [authData?.user]);

  const user = displayUser;

  const [isUploading, setIsUploading] = useState(false);
  const [popup, setPopup] = useState(null);

  const handlePopup = (type, message) => {
    setPopup({ type, message });
    setTimeout(() => setPopup(null), 3000);
  };

  const onboardingFiles = (displayUser?.files || []).filter((f) => f.folder === "onboarding");

  const pdfFile = onboardingFiles.find((f) => f.type === "pdf");
  const imageFile = onboardingFiles.find((f) => f.type === "jpg");
  const isComplete = !!pdfFile && !!imageFile;
  const progress = (pdfFile ? 50 : 0) + (imageFile ? 50 : 0);

  /* -------------------- UPLOAD HANDLERS -------------------- */

  const handleUpload = async (file) => {
    try {
      setIsUploading(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "onboarding");

      const res = await fetch(`${API_URL}/files/${user.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) return handlePopup("error", data.message);

      setAuthData((prev) => ({
        ...prev,
        user: data.user,
      }));

      setDisplayUser(data.user);
      handlePopup("success", "File uploaded ✅");
    } catch {
      handlePopup("error", "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplace = async (file, newFile) => {
    try {
      setIsUploading(true);

      const fd = new FormData();
      fd.append("file", newFile);
      fd.append("folder", "onboarding");

      const res = await fetch(`${API_URL}/upload/${file.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) return handlePopup("error", data.message);

      setAuthData((prev) => ({
        ...prev,
        user: data.user,
      }));

      setDisplayUser(data.user);
      handlePopup("success", "File replaced ✅");
    } catch {
      handlePopup("error", "Replace failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file) => {
    try {
      setIsUploading(true);

      const res = await fetch(`${API_URL}/upload/${file.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) return handlePopup("error", data.message);

      setAuthData((prev) => ({
        ...prev,
        user: data.user,
      }));

      setDisplayUser(data.user);
      handlePopup("success", "File deleted ✅");
    } catch {
      handlePopup("error", "Delete failed");
    } finally {
      setIsUploading(false);
    }
  };

  /* -------------------- NAVIGATION -------------------- */

  const handleNext = () => {
    if (!isComplete) {
      handlePopup("error", "Please upload 1 PDF and 1 image");
      return;
    }
    navigate("/auth/profile");
  };

  /* -------------------- RENDER -------------------- */

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 md:p-6">
      {/* Upload overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#111827] rounded-2xl p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <p className="mt-4 text-[#F8FAFC] font-medium">Uploading...</p>
          </div>
        </div>
      )}

      {/* Popup notifications */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className={`px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 pointer-events-auto ${
              popup.type === "error"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {popup.type === "error" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {popup.message}
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl">
        {/* Main card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Upload className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Complete Your Onboarding
            </h1>
            <p className="text-[#94A3B8] mt-2 text-sm">
              Upload the required documents to continue
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F2937] border border-[rgba(255,255,255,0.06)]">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-[#94A3B8]">1 PDF</span>
              <span className="text-[#64748B]">+</span>
              <Image className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-[#94A3B8]">1 Image</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-10">
            <div className="flex justify-between text-xs text-[#64748B] mb-1.5">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* File cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF slot */}
            {pdfFile ? (
              <FileCard
                file={pdfFile}
                handleDelete={handleDelete}
                handleReplace={handleReplace}
                small
              />
            ) : (
              <AddFileCard
                onUpload={handleUpload}
                accept="application/pdf"
                label="Upload PDF"
                small
              />
            )}

            {/* Image slot */}
            {imageFile ? (
              <FileCard
                file={imageFile}
                handleDelete={handleDelete}
                handleReplace={handleReplace}
                small
              />
            ) : (
              <AddFileCard
                onUpload={handleUpload}
                accept="image/*"
                label="Upload Image"
                small
              />
            )}
          </div>

          {/* Action button */}
          <div className="mt-10 text-center">
            <button
              onClick={handleNext}
              disabled={!isComplete}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                isComplete
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-[#1F2937] text-[#64748B] cursor-not-allowed"
              }`}
            >
              {isComplete ? (
                <>
                  Next → Profile
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Upload required files to continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}