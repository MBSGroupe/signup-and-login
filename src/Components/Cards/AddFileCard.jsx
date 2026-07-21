import { useRef } from "react";

// ─── Design Tokens (Banking Theme) ──────────────────────────────────────────

const ADD_CARD_BASE =
  "group relative w-full aspect-square rounded-xl bg-[#111827] border-2 border-dashed border-white/10 shadow-xl cursor-pointer transition-all hover:border-emerald-500/50 hover:bg-[#182233] flex items-center justify-center";
const PLUS_ICON =
  "text-5xl text-[#64748B] group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300";

export default function AddFileCard({ onUpload }) {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <>
      <div onClick={handleClick} className={ADD_CARD_BASE}>
        <span className={PLUS_ICON}>+</span>
      </div>

      <input ref={inputRef} type="file" hidden onChange={handleChange} />
    </>
  );
}