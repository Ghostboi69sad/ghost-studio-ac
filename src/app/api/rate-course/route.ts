import { ref, update } from 'firebase/database';
import { NextResponse } from 'next/server';

import { database } from '../../lib/firebase';

export async function POST(req: Request) {
  const { courseId, userId, rating, review } = await req.json();
  // Add rating logic
}
