# Minas Grid Map

Prompt para Lovable:

Crie uma página web simples com um mapa interativo do estado de Minas Gerais, usando o contorno real do estado como base.
Sobre esse mapa, aplique uma grade visual de pixels/quadrados proporcionais, considerando que cada quadrado representa aproximadamente 500 x 500 metros do território real.

Requisitos:

Mostrar somente o estado de Minas Gerais.

O formato do estado deve ser preservado geograficamente, sem distorções.

Os quadrados devem aparecer apenas dentro da área do estado.

O mapa deve permitir passar o mouse sobre os quadrados.

Quando o mouse passar sobre um quadrado, ele deve destacar visualmente esse quadrado para demonstrar que a malha está funcionando.

Se possível, ao passar o mouse, mostrar também o ID ou coordenada do quadrado em um pequeno tooltip.

Não precisa ter clique, login, sistema de times, banco de dados ou qualquer outra funcionalidade por enquanto.

O objetivo é apenas validar visualmente a malha de pixels sobre o mapa de Minas Gerais.

A interface deve ser limpa, simples e responsiva.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://minas-grid-map.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0823f385-978d-4c88-970f-77c00e68e83b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Soccer War Brasil — Fase 1

A interface inicial mantém a integração Lovable, o Canvas e a grade geográfica existente. Inclui navegação Mapa/Ranking/Temporada/Perfil, busca municipal, zoom por pinça e botões, navegação por teclado e seleção de célula com painel inferior. As outras abas informam o escopo futuro; não exibem rankings simulados. Autenticação, conquistas, limite diário e temporadas ativas ainda não foram implementados.

A marca usa diretamente o PNG transparente fornecido pelo proprietário, preservando mapa pincelado, bola, nome e slogan. O arquivo original fica em `public/assets/soccer-war-logo.png`.

A resolução aproximada e os IDs da grade foram preservados. A projeção, a origem fixa e a política de fronteiras precisam ser definidas antes de persistir conquistas.

### Verificação manual da interface

- Em celular, buscar Vespasiano, aproximar por pinça e tocar em uma célula: conferir cidade, ID e coordenadas no painel.
- Arrastar e executar pinça: nenhum gesto deve abrir o painel por engano.
- Fechar o painel, usar os botões de zoom e enquadrar Minas Gerais.
- Alternar as quatro abas e retornar ao mapa: manter navegação funcional e nenhum ranking fictício.
- Com o Canvas focado: setas movem, +/- aproximam/afastam, Enter seleciona o centro, 0 enquadra e Escape fecha.
- Testar telas de 320 px, 390 px e desktop; verificar foco, contraste, ausência de rolagem horizontal e área útil do mapa.
- Simular falha na requisição dos dados: apresentar erro e permitir tentar novamente.

Antes de sincronizar: executar build, TypeScript e testes; verificar mudanças remotas, integrar a branch revisada à branch ativa do Lovable e confirmar o commit no editor. Não reescrever o histórico publicado.

### Ajustes de dimensionamento

A linha central do layout ocupa somente a altura disponível entre o cabeçalho e a navegação. Painéis e colunas têm rolagem interna com cores do site; em telas baixas, o conteúdo continua acessível sem ficar encoberto. O selo decorativo de pré-temporada foi removido.
