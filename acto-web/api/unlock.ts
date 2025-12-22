// Vercel Serverless Function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  // @ts-ignore - process.env is available in Vercel runtime
  const accessCode = process.env.ACCESS_CODE;

  // Check if ACCESS_CODE is set
  if (!accessCode) {
    // If no access code is set, allow access (for when feature is disabled)
    return res.status(200).json({ success: true });
  }

  // Validate code
  if (code === accessCode) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'Invalid code' });
}

