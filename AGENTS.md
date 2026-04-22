# AsfaltFlyt

Prosjekt for sporing av asfalttransport. Kodebasen er fortsatt minimal; utvid med språk/rammeverk etter behov.

## Cursor Cloud specific instructions

- Dette repoet har ingen `package.json`, `requirements.txt` eller annen avhengighetsfil ennå. Miljøets `install`-steg er derfor en no-op (`true`).
- Når du legger til avhengigheter: oppdater `.cursor/environment.json` med et idempotent `install`-kommando (f.eks. `npm ci`, `pip install -r requirements.txt`) slik at Cloud Agents får rask og pålitelig oppstart.
- Hemmeligheter og API-nøkler skal settes i [Cursor Cloud Agents – Secrets](https://cursor.com/dashboard/cloud-agents), ikke committes til git.
