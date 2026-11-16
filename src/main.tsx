import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * If a screen throws, show the error and the component path instead of a black
 * page. Replace with a real error reporter when this ships.
 */
class Boundary extends React.Component<{ children: React.ReactNode }, { info: string | null }> {
  state = { info: null as string | null };
  static getDerivedStateFromError() {
    return {};
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: `${error.message}\n\n${info.componentStack ?? ""}` });
  }
  render() {
    if (this.state.info) {
      return (
        <div className="min-h-screen bg-background px-6 py-10 font-mono text-[12px] leading-relaxed text-foreground">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Screen error</div>
          <pre className="whitespace-pre-wrap text-muted-foreground">{this.state.info}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);
