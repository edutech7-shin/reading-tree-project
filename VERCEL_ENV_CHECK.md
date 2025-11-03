# Vercel 환경변수 확인 및 재배포 가이드

## 현재 설정 확인

스크린샷에서 확인된 환경변수:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - 설정됨 (All Environments)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 설정됨 (All Environments)

## 확인 사항

### 1. 값의 완전성 확인
각 환경변수를 클릭하여 전체 값을 확인하세요:

**NEXT_PUBLIC_SUPABASE_URL:**
- 올바른 형식: `https://bydrppgdygacjuharkbh.supabase.co`
- ❌ 잘못된 예: `https://bydrppgdygacjuharkbh.supa...` (끝이 잘린 것처럼 보임)
- ❌ 잘못된 예: `https://bydrppgdygacjuharkbh.supabase.co ` (뒤에 공백)

**NEXT_PUBLIC_SUPABASE_ANON_KEY:**
- 올바른 형식: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (전체 키)
- ❌ 잘못된 예: `eyJhbGci0iJIUzI1NiIsInR5cCI6IkpXV...` (0이 O인 것처럼 잘못 입력됨)
- ❌ 잘못된 예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` (끝이 잘림)

### 2. Supabase 대시보드에서 값 재확인
1. Supabase 대시보드 접속: https://app.supabase.com
2. 프로젝트 선택
3. Settings → API 이동
4. 다음 값들을 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`에 입력
   - **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력

## 재배포 방법

### 방법 1: 수동 재배포 (권장)
1. Vercel 대시보드 → 프로젝트 선택
2. Deployments 탭 이동
3. 가장 최근 배포 항목의 "..." 메뉴 클릭
4. "Redeploy" 선택
5. "Use existing Build Cache" 해제 후 재배포

### 방법 2: Git 푸시로 자동 배포
```bash
# 빈 커밋 생성하여 재배포 트리거
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push origin main
```

## 에러 해결 후 확인

재배포 후:
1. 브라우저에서 페이지 새로고침 (강력 새로고침: Cmd+Shift+R)
2. 로그인 페이지 접속
3. 개발자 도구 콘솔(F12)에서 에러 메시지 확인
4. 콘솔에 다음을 실행하여 환경변수 확인:
   ```javascript
   console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
   console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing')
   ```

## 예상 결과

정상 작동 시:
- 콘솔에 URL과 "present"가 표시됨
- 로그인 버튼 클릭 시 `/me` 페이지로 이동
- 에러 메시지가 나타나지 않음

문제가 지속되면:
- 콘솔 에러 메시지 캡처
- Vercel 배포 로그 확인
- 환경변수 값을 다시 한 번 확인

