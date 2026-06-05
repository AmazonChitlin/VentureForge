export function WebsitePreview({ website }: { website: any }) {
  return (
    <section className="vf-workspace-website-preview">
      <nav><strong>{website.businessName}</strong><span>About</span><span>Services</span><span>FAQ</span><span>Contact</span></nav>
      <div>
        <p>{website.localSeoTitle ?? "Website starter preview"}</p>
        <h2>{website.homepage.headline}</h2>
        <span>{website.homepage.introduction}</span>
        <button type="button">{website.homepage.callToAction}</button>
      </div>
    </section>
  );
}

