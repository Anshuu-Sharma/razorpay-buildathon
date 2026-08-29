import type { CSSProperties, ReactNode } from "react";

// Screen cutout of public/phone/iphone_mock.png, measured from its alpha channel.
const SCREEN: CSSProperties = {
  top: "10.3%",
  bottom: "6.82%",
  left: "12.74%",
  right: "12.74%",
  borderRadius: "7% / 3.5%",
};

/**
 * Renders the iPhone frame PNG with a "screen" slot positioned exactly over its
 * transparent cutout, so children (a WhatsApp thread or a call UI) sit inside the
 * device. Fixed width keeps the corner radius and type sizes predictable.
 */
export default function PhoneFrame({
  children,
  width = 296,
  screenStyle,
}: {
  children: ReactNode;
  width?: number;
  screenStyle?: CSSProperties;
}) {
  return (
    <div className="relative select-none" style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/phone/iphone_mock.png"
        alt=""
        draggable={false}
        className="pointer-events-none block w-full"
      />
      <div className="absolute overflow-hidden" style={{ ...SCREEN, ...screenStyle }}>
        {children}
      </div>
    </div>
  );
}
