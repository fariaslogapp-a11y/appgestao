# Exportação de Relatórios de Comissões em PDF

## Novas Funcionalidades

O sistema agora suporta exportação de relatórios de comissões em formato PDF, além do Excel existente.

### Tipos de Relatórios PDF Disponíveis

#### 1. Relatório Resumo (PDF)
- **Localização**: Tela de Comissões > Aba "Resumo e Viagens" > Botão "Exportar PDF"
- **Conteúdo**:
  - Ranking de todos os motoristas do mês
  - Total de comissão por motorista
  - Quantidade de viagens
  - Total geral de comissões
- **Nome do arquivo**: `comissoes-resumo-[mês-ano].pdf`

#### 2. Relatório Detalhado por Motorista (PDF)
- **Localização**: Tela de Comissões > Selecionar um motorista > Botão "Exportar PDF"
- **Conteúdo**:
  - Informações do motorista selecionado
  - Todas as comissões manuais (pernoites, bonificações, etc.)
  - Todas as viagens com comissão
  - Total de cada tipo de comissão
  - Total geral
- **Nome do arquivo**: `comissoes-detalhes-[nome-motorista]-[mês-ano].pdf`

#### 3. Relatório Completo de Todos os Motoristas (PDF)
- **Localização**: Tela de Comissões > Aba "Resumo e Viagens" > Botão "PDF Completo"
- **Conteúdo**:
  - Relatório individual detalhado de CADA motorista
  - Comissões manuais de cada um
  - Viagens com comissão de cada um
  - Total individual e total geral
  - Ideal para impressão e arquivamento
- **Nome do arquivo**: `comissoes-todos-motoristas-[mês-ano].pdf`

### Como Usar

1. **Resumo Geral**:
   - Acesse a tela de "Comissões"
   - Clique no botão verde "Exportar Excel" para Excel
   - Clique no botão vermelho "Exportar PDF" para PDF do resumo
   - Clique no botão azul "PDF Completo" para PDF detalhado de todos

2. **Detalhes por Motorista**:
   - Clique em "Ver Detalhes" em um motorista específico
   - Ou use os filtros para selecionar um motorista
   - Clique em "Exportar Excel" ou "Exportar PDF"

3. **Filtros**:
   - Os filtros (motorista, origem, destino, veículo) funcionam tanto para Excel quanto para PDF
   - O relatório exportado refletirá os filtros aplicados

### Benefícios

- **PDF Resumo**: Ideal para visualização rápida e apresentações
- **PDF Individual**: Perfeito para entregar ao motorista ou contabilidade
- **PDF Completo**: Excelente para arquivamento e auditoria mensal
- **Formatação Profissional**: Layout limpo com cores e organização clara
- **Informações Completas**: Todas as comissões (viagens + manuais) em um único documento

### Observações

- Os PDFs são gerados no navegador usando jsPDF
- Não requer conexão com internet após carregar a página
- Os arquivos são automaticamente nomeados com mês e ano
- A data e hora de geração aparecem no rodapé do PDF
