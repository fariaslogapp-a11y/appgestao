# GUIA COMPLETO: COMO COLOCAR SEU SISTEMA DE GESTÃO DE FROTA ONLINE

Este guia foi criado para uma pessoa extremamente leiga no assunto conseguir deixar o aplicativo 100% pronto para uso online.

---

## O QUE VOCÊ PRECISA ANTES DE COMEÇAR

Você vai precisar de:
1. Uma conta de **email**
2. Acesso à **internet**
3. Nada mais! Tudo é gratuito.

---

## PASSO 1: CRIAR UMA CONTA NO VERCEL (Hospedagem Gratuita)

O Vercel é um serviço que deixa seu site disponível online de forma gratuita.

### Como fazer:

1. Abra seu navegador (Chrome, Firefox, Safari, etc)
2. Acesse: https://vercel.com
3. Clique em **"Sign Up"** (no canto superior direito)
4. Escolha **"Continue with GitHub"**
   - Se não tiver GitHub, clique em **"Create one"** - é fácil e rápido
5. Preencha os dados básicos (nome, email, senha)
6. Confirm seu email (procure um email do GitHub em sua caixa de entrada)
7. Agora você está dentro do Vercel!

---

## PASSO 2: CONECTAR SEU CÓDIGO AO GITHUB

O GitHub é um lugar seguro onde você guarda o código do seu projeto online.

### Como fazer:

1. Acesse: https://github.com
2. Se não tiver conta, clique em **"Sign up"**
   - Preencha o email, crie uma senha e escolha um nome de usuário
   - Confirme seu email
3. Depois de logado, clique no **"+"** no canto superior direito
4. Escolha **"New repository"**
5. Na tela que abrir:
   - **Repository name**: Digite `frota-app` (ou qualquer nome que queira)
   - **Description**: Digite `Sistema de Gestão de Frota`
   - **Public**: Deixe selecionado
   - **Initialize with README**: Deixe DESMARCADO
   - Clique em **"Create repository"**
6. Você vai ver uma tela com instruções. Copie os comandos que aparecem sob "...or push an existing repository from the command line"

### IMPORTANTE: Próxima parte requer usar o Terminal/CMD

Se você nunca usou terminal antes, não se preocupe! Vou explicar cada passo.

#### Para Windows:
1. Clique no botão **Windows** (abaixo à esquerda da tela)
2. Digite `cmd`
3. Aperte Enter
4. Uma janela preta deve abrir

#### Para Mac:
1. Pressione **Command + Space**
2. Digite `terminal`
3. Aperte Enter
4. Uma janela preta deve abrir

Agora você está no Terminal/CMD. Vamos usar os comandos que o GitHub te deu:

```
git config --global user.email "seu_email@gmail.com"
git config --global user.name "Seu Nome"
```

Substitua "seu_email@gmail.com" pelo seu email real e "Seu Nome" pelo seu nome real. Aperte Enter após cada linha.

Agora, navegue até a pasta do seu projeto. Digite:

```
cd caminho/da/pasta/do/seu/projeto
```

Se você não sabe o caminho, procure a pasta onde estão os arquivos do projeto no seu computador. Pode ser algo como:
- Windows: `C:\Users\SeuNome\Desktop\meu-projeto`
- Mac: `/Users/SeuNome/Desktop/meu-projeto`

Agora copie os comandos do GitHub que você copiou anteriormente e cole no terminal. Eles provavelmente se parecem com:

```
git add .
git commit -m "Initial commit"
git branch -M main                                          
git remote add origin https://github.com/seu_usuario/frota-app.git
git push -u origin main
```

Cole cada um e aperte Enter. Isso pode levar alguns minutos.

Quando terminar, recarregue a página do GitHub. Você deve ver seus arquivos lá!

---

## PASSO 3: CONECTAR GITHUB AO VERCEL

Agora você vai conectar o Vercel ao GitHub para que o site seja atualizado automaticamente.

### Como fazer:

1. Volte para https://vercel.com
2. Você deve estar logado
3. Clique em **"Add New Project"**
4. Clique em **"Continue with GitHub"**
5. Um popup pode aparecer pedindo permissão. Clique em **"Authorize Vercel"**
6. Agora você deve ver uma lista de seus repositórios
7. Procure por **`frota-app`** (o nome que você deu ao repositório)
8. Clique em **"Import"**
9. Na próxima tela, você vai ver as configurações do projeto
   - Deixe tudo como está
   - NÃO precisa mudar nada
10. Clique em **"Deploy"**
11. Aguarde 2-3 minutos enquanto o Vercel faz a mágica
12. Você verá uma tela com um botão **"Visit"** ou um link - CLIQUE NELE!

PRONTO! Seu site está online! Copie o link (deve ser algo como: `https://frota-app-abc123.vercel.app`) e compartilhe com seus 3-4 colegas de trabalho.

---

## PASSO 4: COMPARTILHAR COM SEUS COLEGAS

Agora que seu aplicativo está online:

1. Copie o link que você obteve no Passo 3 (algo como `https://frota-app-abc123.vercel.app`)
2. Envie por:
   - Email
   - WhatsApp
   - Slack
   - Qualquer ferramenta de comunicação
3. Seus colegas só precisam abrir o link no navegador
4. NÃO precisa de nome de usuário ou senha
5. Todos podem usar simultaneamente

---

## FAZENDO MUDANÇAS NO APLICATIVO

Se você ou alguém precisar fazer mudanças no aplicativo no futuro:

1. Você edita os arquivos no seu computador
2. Abre o Terminal/CMD novamente
3. Navega até a pasta do projeto (`cd caminho/da/pasta`)
4. Digita:
   ```
   git add .
   git commit -m "Descrição da mudança que você fez"
   git push
   ```
5. Espera 2-3 minutos
6. O Vercel atualiza automaticamente o site online
7. Pronto! Seus colegas veem as mudanças quando recarregam a página

---

## DADOS DO SEU BANCO DE DADOS

Os dados do seu aplicativo estão seguros no Firebase (um banco de dados na nuvem do Google).

As credenciais já estão configuradas no seu projeto no arquivo `src/lib/firebase.ts`.

Você pode acessar o painel do Firebase em: https://console.firebase.google.com

---

## INFORMAÇÕES DO SEU BANCO DE DADOS FIREBASE

Seu banco de dados Firebase está configurado e funcionando. As coleções principais são:

### 1. **Veículos** (Vehicles)
   - Placa, tipo, marca, modelo, ano
   - Quilometragem atual
   - Status (ativo, em manutenção, inativo)

### 2. **Viagens** (Trips)
   - Origem e destino
   - Data de partida e chegada
   - Valor do frete
   - CTE, NFe, MDFe, comprovante de entrega

### 3. **Manutenções** (Maintenances)
   - Data da manutenção
   - Quilometragem na manutenção
   - Tipo (preventiva, corretiva, revisão)
   - Custo
   - Próxima manutenção prevista

### 4. **Trocas de Pneus** (Tire Changes)
   - Data da troca
   - Quilometragem
   - Posição do pneu
   - Marca do pneu
   - Custo

---

## RESOLVENDO PROBLEMAS

### "O link não está funcionando"
- Aguarde 5 minutos após clicar em "Deploy"
- Recarregue a página com F5 ou Ctrl+R

### "O site está carregando muito lentamente"
- É normal na primeira carga
- Deixe carregar por alguns segundos

### "Meus colegas não conseguem acessar"
- Certifique-se de enviar o link completo
- O link começa sempre com "https://"

### "Perdi meus dados"
- Os dados estão salvos no Firebase
- Se você recarregar a página, os dados continuarão lá
- Recarregue a página com F5

---

## SUPORTE E AJUDA

Se algo não funcionar:

1. **Vercel**: https://vercel.com/support
2. **Firebase**: https://firebase.google.com/support
3. **GitHub**: https://docs.github.com

---

## CHECKLIST FINAL

Você completou tudo quando:

- [ ] Criou conta no Vercel
- [ ] Criou conta no GitHub
- [ ] Colocou o código no GitHub
- [ ] Conectou GitHub ao Vercel
- [ ] Recebeu um link do tipo `https://frota-app-xxx.vercel.app`
- [ ] Abriu o link e o aplicativo está funcionando
- [ ] Compartilhou o link com seus colegas
- [ ] Todos conseguem acessar e usar o aplicativo

---

**Parabéns! Seu Sistema de Gestão de Frota está online e pronto para uso!**
