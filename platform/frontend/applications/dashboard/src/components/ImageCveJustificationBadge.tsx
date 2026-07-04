type Justification =
  | "component_not_present"
  | "vulnerable_code_not_present"
  | "vulnerable_code_not_in_execute_path"
  | "vulnerable_code_cannot_be_controlled_by_adversary"
  | "inline_mitigations_already_exist";

type Props = {
  justification: string;
};

const JUSTIFICATION_STYLES: Record<Justification, string> = {
  component_not_present: "border-white/60 bg-white/10 text-white",
  vulnerable_code_not_present: "border-white/60 bg-white/10 text-white",
  vulnerable_code_not_in_execute_path: "border-white/60 bg-white/10 text-white",
  vulnerable_code_cannot_be_controlled_by_adversary: "border-white/60 bg-white/10 text-white",
  inline_mitigations_already_exist: "border-white/60 bg-white/10 text-white",
};

export default function ImageCveJustificationBadge({ justification }: Props) {
  const style =
    JUSTIFICATION_STYLES[justification as Justification] ??
    "border-white/60 bg-white/10 text-white";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      {justification}
    </span>
  );
}
