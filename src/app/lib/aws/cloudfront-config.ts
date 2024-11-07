export const getMediaUrl = (key: string) => {
  const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  if (!cloudfrontDomain) {
    throw new Error('CloudFront domain not configured');
  }
  return `${cloudfrontDomain}/${key}`;
}; 