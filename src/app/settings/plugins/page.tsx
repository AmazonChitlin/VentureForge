import Link from "next/link";

import {
  MarketResearchMethodPlugin,
  MockFundingPlugin,
  MockStateResourcePlugin,
  WebsiteThemePlugin,
} from "@/engine/plugins";

const plugins = [
  new MockFundingPlugin(),
  new MockStateResourcePlugin(),
  new WebsiteThemePlugin(),
  new MarketResearchMethodPlugin(),
];

export default function PluginsPage() {
  return (
    <main className="vf-library-page">
      <header><Link className="vf-wordmark" href="/dashboard">VentureForge</Link><Link href="/dashboard">Back to dashboard</Link></header>
      <section><p className="vf-section-label">Optional add-ons</p><h1>Extra tools for later</h1><p>Most people do not need this page. These add-ons are checked before they can contribute data or planning drafts.</p></section>
      <div className="vf-resource-grid">
        {plugins.map((plugin) => (
          <article key={plugin.id}>
            <small>{plugin.type.replaceAll("_", " ")} add-on</small>
            <h2>{plugin.name}</h2>
            <p>This optional tool is {plugin.enabled ? "turned on" : "turned off"}. Its information must keep a visible source label.</p>
            <details><summary>Show technical details</summary><span>Version {plugin.version}. Source type: {plugin.sourceType}. ID: {plugin.id}</span></details>
          </article>
        ))}
      </div>
    </main>
  );
}
