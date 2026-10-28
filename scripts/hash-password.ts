import { hashPassword } from "../src/lib/password";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Uso: npm run hash-password -- "tu-contraseña" (mínimo 8 caracteres)');
  process.exit(1);
}
hashPassword(password).then((h) => console.log(h));
