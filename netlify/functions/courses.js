const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

exports.handler = async (event, context) => {
  try {
    const db = admin.database();
    
    if (event.httpMethod === 'GET') {
      const snapshot = await db.ref('courses').once('value');
      return {
        statusCode: 200,
        body: JSON.stringify(snapshot.val() || {}),
      };
    }

    // التحقق من المصادقة للعمليات الأخرى
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      throw new Error('توكن غير صالح');
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userRef = db.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    const isAdmin = userSnapshot.val()?.role === 'admin';

    if (!isAdmin) {
      throw new Error('صلاحيات غير كافية');
    }

    if (event.httpMethod === 'POST') {
      const course = JSON.parse(event.body);
      await db.ref(`courses/${course.id}`).set(course);
      return {
        statusCode: 201,
        body: JSON.stringify(course),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.code === 'auth/id-token-expired' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
