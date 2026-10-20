// src/Components/ProtectedImg.jsx
// <img> for files that may live behind the authenticated /storage/* route.
import { useProtectedFileUrl } from "../Hooks/useProtectedFileUrl";

export default function ProtectedImg({ src, fallback, ...props }) {
  const { src: resolved } = useProtectedFileUrl(src);
  const finalSrc = resolved || fallback;
  if (!finalSrc) return null;
  return <img src={finalSrc} {...props} />;
}
