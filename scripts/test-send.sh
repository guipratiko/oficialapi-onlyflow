#!/usr/bin/env bash
# Teste de envio de mensagem via API Oficial WhatsApp
# Uso: ./scripts/test-send.sh <número_destino> [texto] [phone_number_id]
# Número: só dígitos com DDI, ex: 5562999999999 (sem + ou espaços)

set -e
NUMBER="${1:?Informe o número (ex: 5562999999999)}"
TEXT="${2:-Teste de envio OnlyFlow - API Oficial}"
PHONE_NUMBER_ID="${3:-1012381368628354}"
BASE_URL="${OFFICIAL_API_URL:-http://localhost:4338}"
# Sandbox: OFFICIAL_API_URL=https://aof-sandbox.onlyflow.com.br
API_KEY="${OFFICIAL_API_KEY:-Cfjakr3whagf3nc9smwfnnhbs2rclsa}"

echo "Enviando para $NUMBER via phone_number_id=$PHONE_NUMBER_ID"
echo "Texto: $TEXT"
echo "POST $BASE_URL/api/message/send"
echo ""

curl -s -X POST "$BASE_URL/api/message/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"phone_number_id\":\"$PHONE_NUMBER_ID\",\"number\":\"$NUMBER\",\"text\":\"$TEXT\"}" | jq .

echo ""
