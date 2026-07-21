export default function SectionTitle({ title }) {
  return (
    <div className="text-2xl md:text-3xl font-bold text-[#F8FAFC] mb-6 relative inline-block">
      <span className="absolute left-0 -bottom-2 w-12 h-0.5 bg-emerald-500 rounded-full"></span>
      {title}
    </div>
  );
}