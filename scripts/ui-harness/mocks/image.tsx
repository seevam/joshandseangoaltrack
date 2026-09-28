// eslint-disable-next-line @next/next/no-img-element
export default function Image({ src, alt, width, height, ...rest }: { src: string; alt: string; width?: number; height?: number } & Record<string, unknown>) {
  return <img src={src} alt={alt} width={width} height={height} {...rest} />;
}
