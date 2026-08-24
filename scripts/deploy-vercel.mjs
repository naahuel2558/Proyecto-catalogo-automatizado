import fs from 'fs';
import path from 'path';

async function deployToVercel() {
  const tarballPath = path.join(process.cwd(), 'project.tgz');
  if (!fs.existsSync(tarballPath)) {
    console.error('No se encontró el archivo project.tgz');
    process.exit(1);
  }

  console.log('🚀 Subiendo proyecto a Vercel...');

  const fileBuffer = fs.readFileSync(tarballPath);
  const blob = new Blob([fileBuffer], { type: 'application/gzip' });

  const formData = new FormData();
  formData.append('file', blob, 'project.tgz');
  formData.append('framework', 'nextjs');

  const res = await fetch('https://claude-skills-deploy.vercel.com/api/deploy', {
    method: 'POST',
    body: formData,
  });

  const responseText = await res.text();
  console.log('Respuesta del servidor:', responseText);

  try {
    const data = JSON.parse(responseText);
    const previewUrl = data.previewUrl || data.url || (data.deployment && data.deployment.url);
    const claimUrl = data.claimUrl || data.claim_url;
    console.log('\n==================================================');
    console.log('🎉 ¡DESPLIEGUE EXITOSO EN VERCEL!');
    console.log('==================================================');
    console.log(`🌐 Preview URL: ${previewUrl}`);
    if (claimUrl) console.log(`🔑 Claim URL:   ${claimUrl}`);
    console.log('==================================================\n');
  } catch (e) {
    console.error('Error parseando JSON:', e);
  }

  if (fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}

deployToVercel().catch((err) => {
  console.error('Error al desplegar:', err);
  process.exit(1);
});
