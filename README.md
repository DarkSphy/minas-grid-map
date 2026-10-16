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

A interface inicial mantém a integração Lovable, o Canvas e a grade geográfica existente. Inclui navegação Mapa/Ranking/Temporada/Perfil, busca municipal, zoom por pinça e botões, navegação por teclado e seleção de célula com painel inferior. Essa primeira entrega foi ampliada pelo MVP jogável local descrito abaixo. A autenticação real e o multiplayer compartilhado continuam dependendo do backend.

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

## MVP jogável em modo local

Esta versão permite testar o ciclo inteiro sem configurar Lovable Cloud ou Supabase:

1. Clique em **Entrar**, use qualquer nome e qualquer senha de teste. A opção de criar perfil utiliza o mesmo fluxo local. Nenhuma senha é salva ou enviada.
2. Escolha Cruzeiro, Atlético Mineiro ou América Mineiro. O clube fica vinculado à temporada.
3. Busque uma cidade, aproxime o mapa, toque em um quadrado e confirme a conquista.
4. Confira a alteração da cor, o saldo de ações, o perfil e os rankings estadual e municipal.
5. Para testar uma torcida rival, saia pelo perfil e entre com outro nome. As abas do mesmo navegador compartilham o mundo, mas cada aba mantém sua própria sessão.

### Regras demonstráveis

- Uma ação por jogador por dia, renovada à meia-noite de Brasília. Não há regra de adjacência.
- Células neutras e rivais podem ser conquistadas; repintar um território do próprio clube não consome ação.
- Ranking considera o proprietário atual, enquanto o perfil mantém o histórico de conquistas realizadas.
- Temporadas locais de 14 dias a partir da primeira abertura neste navegador. Ao encerrar, a classificação final é arquivada, os territórios ficam neutros e cada jogador escolhe seu clube novamente.
- Empates são exibidos sem inventar um campeão único. Temporadas vazias não têm campeão.
- No zoom afastado, as cores são agrupadas em blocos de exibição de 32 × 32 células, com o clube predominante e cinza para empate. Isso não muda os IDs, a resolução geográfica ou a contagem dos territórios. Ao aproximar, aparecem as células individuais.

### Organização e persistência

- `src/game/model.ts`: regras puras e cálculos de ranking, ação diária e temporadas.
- `src/game/repository.ts`: contrato das operações e adaptador local; validação do formato salvo e bloqueio de escrita entre abas quando Web Locks está disponível.
- `src/game/use-game.ts`: sessão, comandos e sincronização da interface.
- `src/game/GamePanels.tsx`: entrada, escolha de clube, rankings, temporada e perfil.
- `src/game/model.test.ts`: testes das regras de domínio.

O localStorage guarda somente células conquistadas, perfis e histórico. A sessão da aba usa sessionStorage. O namespace é `soccer-war:demo:v1`, separado de integrações futuras; limpar os dados do navegador apaga a demonstração. Senhas não fazem parte do contrato de armazenamento. Erros de gravação são exibidos e não confirmam uma conquista que não foi salva.

### Conectar o backend depois

O modo atual é uma demonstração local, não autenticação ou multiplayer de produção. Pessoas em dispositivos diferentes não compartilham conquistas, e nome, relógio e dados locais podem ser modificados pelo visitante. Abra o mesmo nome para recuperar o perfil local, independentemente da senha informada.

Para produção, implementar as operações do repositório com autenticação real e chamadas ao servidor. A conquista deve ser uma transação atômica que valida usuário, clube da temporada, célula geográfica válida, disponibilidade diária e temporada ativa usando o relógio do servidor. O servidor deve derivar o município dos dados oficiais; não confiar nas coordenadas, clube ou município enviados pelo navegador. Adicionar políticas de acesso, restrições únicas, consultas de territórios por área visível, agregação de rankings, histórico e notificações de atualização. A interface não deve baixar todas as conquistas nacionais.

O contrato geográfico definitivo (projeção, origem fixa, IDs versionados e política de divisas) continua pendente antes de salvar conquistas reais. As conquistas locais usam `mg-legacy-v1` e não devem ser migradas automaticamente para produção. Não configure nem publique este login simulado como autenticação real.

## Escudos, paisagem e consulta municipal

Os nomes dos municípios não são desenhados permanentemente no Canvas. A busca continua centralizando a cidade; hover no desktop e toque no celular mostram o município, o controlador da célula e a liderança municipal. A liderança usa somente células conquistadas da temporada atual: o percentual representa a participação nos territórios conquistados, não a área total do município. Empates mostram todos os líderes; cidades sem conquistas não têm líder. O índice municipal é recalculado apenas quando muda o conjunto de territórios.

Os escudos são arquivos originais obtidos das páginas oficiais, salvos localmente para não depender de hotlink:

- Cruzeiro: imagem PNG circular embutida no cabeçalho de https://www.cruzeiro.com.br/ (72 × 72).
- Atlético: https://atletico.com.br/wp-content/uploads/2022/01/atletico.svg, referenciado no site oficial https://atletico.com.br/.
- América: https://irp.cdn-website.com/05448cb5/dms3rep/multi/Logo.png, referenciado em https://www.americafc.com.br/.

Arquivos em `public/assets/clubs/`; os emblemas não foram redesenhados. `src/game/ClubCrest.tsx` centraliza a apresentação dos escudos e do resumo municipal. As marcas continuam pertencendo aos respectivos clubes.

A paisagem decorativa `public/assets/minas-evening.webp` foi gerada para este projeto: composição inspirada nas serras e na arquitetura colonial mineira, sem pretensão de fotografia geográfica documental. A versão WebP tem aproximadamente 185 kB. O fundo é independente do Canvas e usa camadas escuras; a grade, os IDs, os limites estaduais e as cores das conquistas permanecem intactos. No celular, o painel de consulta ocupa no máximo 56% da área do mapa e permite rolagem interna.
