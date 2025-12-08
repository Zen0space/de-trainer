import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 401 });
    }

    // Get the secret from environment
    const adminSecret = process.env.ADMIN_ACCESS_SECRET;

    if (!adminSecret) {
      console.error('[Admin] ADMIN_ACCESS_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Hash the provided key
    const hashedKey = createHash('sha256').update(key).digest('hex');
    
    // Hash the secret for comparison
    const hashedSecret = createHash('sha256').update(adminSecret).digest('hex');

    // Compare hashes
    if (hashedKey === hashedSecret) {
      return NextResponse.json({ valid: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
  } catch (error) {
    console.error('[Admin] Validation error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
