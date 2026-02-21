# Atualização Automática de KM dos Veículos

## Resumo

O sistema agora atualiza automaticamente o campo **KM ATUAL** dos veículos sempre que:
1. Uma manutenção é registrada (KM na Manutenção)
2. Uma troca de pneu é registrada (KM na Troca)
3. Uma ficha de inspeção de pneus é preenchida (KM Atual - campo novo obrigatório)

O KM do veículo sempre reflete o último valor registrado, desde que seja diferente de 0.

## Alterações Realizadas

### 1. Arquivo de Utilitários Criado

**Arquivo:** `src/utils/vehicleKmUpdate.ts`

Função centralizada para atualizar o KM do veículo:
- Valida que o veículo existe e o KM é maior que 0
- Atualiza o campo `current_km` no Firebase
- Trata erros silenciosamente para não interromper o fluxo

### 2. Tipos Atualizados

**Arquivo:** `src/types/index.ts`

Adicionado campo `current_km: number` à interface `TireInspectionForm`:
- Permite armazenar o KM no momento da inspeção
- Campo obrigatório para todas as fichas de inspeção

### 3. Componente de Manutenção Atualizado

**Arquivo:** `src/components/Maintenance.tsx`

**Alterações:**
- Importado `updateVehicleKm` do arquivo de utilitários
- **Função `handleMaintenanceSubmit`**: Após salvar a manutenção, atualiza o KM do veículo com `km_at_maintenance`
- **Função `handleTireSubmit`**: Após salvar a troca de pneu, atualiza o KM do veículo com `km_at_change`

### 4. Geração de Fichas de Inspeção Atualizada

**Arquivo:** `src/components/TireInspectionSheet.tsx`

**Alterações:**
- Ao criar uma nova ficha de inspeção, o campo `current_km` é inicializado com 0
- O motorista deverá preencher este campo ao completar a ficha

### 5. Preenchimento da Ficha de Inspeção Atualizado

**Arquivo:** `src/components/TireInspectionFormPage.tsx`

**Alterações Principais:**

#### Estado e Validação:
- Adicionado estado `currentKm` para armazenar o KM informado pelo motorista
- Validação obrigatória: o motorista não pode enviar a ficha sem preencher o KM

#### Interface do Usuário:
- Novo campo **"KM Atual do Veículo"** exibido na coluna direita antes da lista de pneus
- Campo numérico obrigatório com validação mínima (> 0)
- Mensagem clara indicando que é campo obrigatório
- Botão "Enviar Ficha" desabilitado enquanto o KM não for preenchido

#### Submissão do Formulário:
- Ao enviar a ficha, salva o `current_km` no registro da ficha
- Chama `updateVehicleKm` para atualizar o KM do veículo no banco de dados
- Validação adicional para garantir que o KM seja maior que 0

## Como Funciona

### Fluxo de Manutenção:
1. Usuário cadastra uma manutenção e informa o KM
2. Sistema salva a manutenção
3. Sistema atualiza automaticamente o KM do veículo

### Fluxo de Troca de Pneu:
1. Usuário registra uma troca de pneu e informa o KM
2. Sistema salva a troca de pneu
3. Sistema atualiza automaticamente o KM do veículo

### Fluxo de Inspeção de Pneus:
1. Gerente gera link de inspeção para um veículo
2. Motorista acessa o link e verifica seus dados
3. Motorista preenche informações de cada pneu
4. **Motorista OBRIGATORIAMENTE informa o KM Atual do veículo**
5. Motorista envia a ficha
6. Sistema salva as respostas da inspeção
7. Sistema atualiza o campo `current_km` na ficha de inspeção
8. Sistema atualiza automaticamente o KM do veículo

## Validações Implementadas

1. **KM deve ser maior que 0**: Valores zerados não atualizam o veículo
2. **Campo obrigatório**: O sistema não permite envio sem preencher o KM
3. **Validação silenciosa**: Erros na atualização do KM não interrompem o fluxo principal
4. **Última atualização prevalece**: O KM sempre reflete o último valor registrado

## Impacto no Usuário

### Para o Gerente:
- Não precisa mais atualizar manualmente o KM dos veículos
- KM sempre atualizado e sincronizado com as operações

### Para o Motorista:
- Novo campo obrigatório na ficha de inspeção de pneus
- Interface clara indicando que o campo é obrigatório
- Não consegue enviar a ficha sem preencher o KM

## Banco de Dados

### Coleção `vehicles`:
- Campo `current_km` atualizado automaticamente

### Coleção `tire_inspection_forms`:
- Novo campo `current_km` armazenando o KM no momento da inspeção

### Coleções não alteradas:
- `maintenances` (já tinha `km_at_maintenance`)
- `tire_changes` (já tinha `km_at_change`)

## Build e Compatibilidade

✅ Projeto compilado com sucesso
✅ Sem erros de TypeScript
✅ Todas as validações implementadas
✅ Interface responsiva mantida
✅ Compatível com todos os tipos de veículos (carro, 3/4, toco, truck, bitruck, cavalo, carreta)

## Observações Importantes

1. **Histórico preservado**: As fichas antigas de inspeção (antes desta atualização) não têm o campo `current_km`, mas isso não causa problemas
2. **Novas fichas**: Todas as novas fichas de inspeção exigirão o campo KM Atual
3. **Sincronização**: O KM é atualizado imediatamente após cada operação
4. **Sem duplicação**: Cada operação atualiza o KM independentemente, não há acúmulo
