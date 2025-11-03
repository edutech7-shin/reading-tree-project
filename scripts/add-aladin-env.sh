#!/bin/bash

# 알라딘 API 키를 Vercel 환경 변수로 추가하는 스크립트
ALADIN_API_KEY="ttbkhami10002233001"

echo "Vercel에 ALADIN_API_KEY 환경 변수를 추가합니다..."
echo ""

# Production 환경
echo "Production 환경 추가 중..."
echo "$ALADIN_API_KEY" | npx vercel@latest env add ALADIN_API_KEY production

# Preview 환경
echo ""
echo "Preview 환경 추가 중..."
echo "$ALADIN_API_KEY" | npx vercel@latest env add ALADIN_API_KEY preview

# Development 환경
echo ""
echo "Development 환경 추가 중..."
echo "$ALADIN_API_KEY" | npx vercel@latest env add ALADIN_API_KEY development

echo ""
echo "✅ 모든 환경에 ALADIN_API_KEY가 추가되었습니다!"
echo "💡 Vercel 대시보드에서 확인 후 Redeploy를 실행하세요."

