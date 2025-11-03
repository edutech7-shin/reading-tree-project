# 알라딘 Open API 설정 가이드

## 1. 환경 변수 설정

알라딘 API를 사용하려면 Vercel에 환경 변수를 추가해야 합니다.

### Vercel 설정 방법

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables** 이동
3. 다음 환경 변수 추가:

```
Key: ALADIN_API_KEY
Value: ttbkhami10002233001
Environment: Production, Preview, Development 모두 선택
```

4. **Save** 후 **Redeploy** 클릭

### 로컬 개발 환경 설정

`.env.local` 파일에 추가:

```env
ALADIN_API_KEY=ttbkhami10002233001
```

## 2. API 사용 방식

### 검색 흐름

1. 사용자가 책 검색 시 `book_cache` 테이블에서 먼저 확인
2. 캐시에 없으면 알라딘 API 호출
3. API 결과를 `book_cache`에 저장 (다음 검색 시 빠른 응답)
4. 검색 결과 반환

### 알라딘 API 제한사항

- 하루 최대 호출: 5,000건
- 상업적 사용 시 제한 가능
- 캐시를 통해 API 호출 최소화

## 3. 테스트 방법

1. `/record` 페이지 접속
2. "책 검색하기" 버튼 클릭
3. 책 제목 입력 (예: "해리포터")
4. 검색 결과 확인

## 4. 문제 해결

### 검색 결과가 나오지 않는 경우

1. 환경 변수가 올바르게 설정되었는지 확인
2. Vercel에서 환경 변수 추가 후 **Redeploy** 했는지 확인
3. 알라딘 API 일일 호출 제한(5,000건)을 초과하지 않았는지 확인

### 캐시 저장 실패

- RLS 정책 확인: `book_cache` 테이블의 insert 권한
- 로그 확인: Vercel 로그에서 `[Book Search] Cache save warning` 메시지 확인

