import { BuilderIcon } from "@/components/guided-builder/icons";

export function WhyWeAskThis({ children }: { children: string }) {
  return (
    <details className="vf-why">
      <summary>
        Why we ask this
        <BuilderIcon name="chevron" size={17} />
      </summary>
      <p>{children}</p>
    </details>
  );
}
