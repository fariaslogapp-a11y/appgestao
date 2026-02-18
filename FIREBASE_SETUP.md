# Guia de Configuração do Firebase

Este sistema agora utiliza Firebase Firestore como banco de dados em modo público (sem autenticação).

## Passo 1: Configurar Regras do Firestore

Para permitir acesso público ao banco de dados, você precisa configurar as regras do Firestore:

1. Acesse o Console do Firebase: https://console.firebase.google.com
2. Selecione seu projeto: **fariasfrotas**
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules** (Regras)
5. Substitua as regras existentes pelo seguinte código:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. Clique em **Publicar** para aplicar as regras

**IMPORTANTE:** Essas regras permitem acesso público total ao banco de dados. Use apenas em ambientes controlados ou para testes.

## Passo 2: Criar o Banco de Dados

1. No Console do Firebase, vá em **Firestore Database**
2. Se ainda não criou o banco, clique em **Criar banco de dados**
3. Escolha o modo de produção (Production mode)
4. Selecione a localização mais próxima (ex: southamerica-east1 para São Paulo)
5. Clique em **Criar**

## Estrutura das Coleções

O sistema criará automaticamente as seguintes coleções quando você adicionar dados:

### 1. `vehicles` (Veículos)
Campos:
- `plate` (string): Placa do veículo
- `type` (string): Tipo (3/4, toco, truck, bitruck, cavalo, carreta)
- `brand` (string): Marca
- `model` (string): Modelo
- `year` (number): Ano
- `current_km` (number): Quilometragem atual
- `is_refrigerated` (boolean): Se é refrigerado
- `status` (string): Status (active, maintenance, inactive)
- `notes` (string): Observações
- `coupled_vehicle_id` (string | null): ID do veículo acoplado
- `created_at` (string): Data de criação

### 2. `drivers` (Motoristas)
Campos:
- `name` (string): Nome completo
- `cpf` (string): CPF
- `phone` (string): Telefone
- `email` (string): Email
- `cnh_number` (string): Número da CNH
- `cnh_validity` (string): Validade da CNH
- `status` (string): Status (active, inactive)
- `notes` (string): Observações
- `created_at` (string): Data de criação

### 3. `trips` (Viagens)
Campos:
- `vehicle_id` (string): ID do veículo
- `driver_id` (string | null): ID do motorista
- `status` (string): Status (planned, in_progress, completed, cancelled)
- `origin` (string): Origem
- `destination` (string): Destino
- `departure_date` (string): Data de partida
- `arrival_date` (string | null): Data de chegada
- `freight_value` (number): Valor do frete
- `driver_commission` (number | null): Comissão do motorista
- `cte` (string): CT-e
- `nfe` (string): NF-e
- `pallet_term` (string): Termo pallet
- `mdfe` (string): MDF-e
- `receipt` (string): Canhoto/Recibo
- `notes` (string): Observações
- `created_at` (string): Data de criação

### 4. `maintenances` (Manutenções)
Campos:
- `vehicle_id` (string): ID do veículo
- `maintenance_date` (string): Data da manutenção
- `km_at_maintenance` (number): KM na manutenção
- `type` (string): Tipo (preventiva, corretiva, revisão)
- `description` (string): Descrição
- `cost` (number): Custo
- `next_maintenance_km` (number | null): Próxima manutenção em KM
- `notes` (string): Observações
- `created_at` (string): Data de criação

### 5. `tire_changes` (Trocas de Pneus)
Campos:
- `vehicle_id` (string): ID do veículo
- `change_date` (string): Data da troca
- `km_at_change` (number): KM na troca
- `tire_position` (string): Posição do pneu
- `tire_brand` (string): Marca do pneu
- `cost` (number): Custo
- `notes` (string): Observações
- `created_at` (string): Data de criação

## Índices Recomendados

Para melhor performance, crie os seguintes índices compostos:

1. **Collection: vehicles**
   - Campo: `created_at` (Descending)

2. **Collection: drivers**
   - Campo: `name` (Ascending)

3. **Collection: trips**
   - Campo: `departure_date` (Descending)
   - Campo: `status` (Ascending)

4. **Collection: maintenances**
   - Campo: `maintenance_date` (Descending)

5. **Collection: tire_changes**
   - Campo: `change_date` (Descending)

Para criar índices:
1. Acesse **Firestore Database** > **Indexes**
2. Clique em **Create Index**
3. Selecione a coleção
4. Adicione os campos com as ordenações especificadas
5. Clique em **Create**

## Verificação

Após configurar:

1. Execute o projeto: `npm run dev`
2. Tente adicionar um veículo, motorista ou viagem
3. Verifique se os dados aparecem no Console do Firebase em **Firestore Database**

## Segurança

**ATENÇÃO:** Este sistema está configurado para acesso público total. Para produção, considere:

- Implementar autenticação (Firebase Auth)
- Ajustar as regras do Firestore para validar permissões
- Usar variáveis de ambiente seguras
- Implementar rate limiting no Firebase

## Suporte

Caso tenha problemas:

1. Verifique se as regras do Firestore estão corretas
2. Confirme que o banco de dados foi criado
3. Verifique o console do navegador para erros
4. Consulte a documentação: https://firebase.google.com/docs/firestore
