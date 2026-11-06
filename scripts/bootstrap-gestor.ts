import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Carrega credenciais do Service Account no diretório raiz do projeto
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json não encontrado na raiz do projeto.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

async function bootstrapGestor() {
  const email = 'mascarenhasr02@gmail.com';

  try {
    initializeApp({
      credential: cert(serviceAccount),
    });
    const auth = getAuth();
    const db = getFirestore();

    const user = await auth.getUserByEmail(email);
    console.log(`Usuário encontrado: ${user.uid}`);

    // Define role gestor via claims (usado para regras de segurança se necessário no futuro)
    await auth.setCustomUserClaims(user.uid, { role: 'gestor' });
    console.log('Claims de gestor aplicadas.');

    // Atualiza o documento de perfil no Firestore.
    // `displayName` é o campo canônico do modelo; o front-end usa `nome`
    // apenas como tipo de domínio e faz fallback para o Firebase Auth.
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({
      uid: user.uid,
      email: (user.email ?? email).toLowerCase(),
      displayName: user.displayName?.trim() || email.split('@')[0] || 'Gestor',
      role: 'gestor',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('Perfil de gestor atualizado com sucesso no Firestore.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao configurar gestor:', error);
    process.exit(1);
  }
}

bootstrapGestor();
