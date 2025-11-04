# 도서관 정보나루 API 설정 가이드

## 1. API 키 발급

### 발급 절차
1. [도서관 정보나루](https://data4library.kr/) 접속
2. 회원가입 후 로그인
3. 마이페이지 → 인증키 메뉴 선택
4. 이용 목적 선택 및 개인정보 수집 동의
5. **승인 대기 (중요!)**
   - 승인에는 시간이 소요될 수 있습니다 (보통 몇 시간~1일)
   - 마이페이지에서 승인 상태를 확인할 수 있습니다
   - 승인 전에는 API 호출이 정상 작동하지 않습니다
   - 승인 완료 후 검색 기능이 정상 작동합니다

### 상세 안내
- [Open API 활용방법](https://data4library.kr/apiUtilization)

## 2. 환경 변수 설정

### Vercel 설정
1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 환경 변수 추가:

```
Key: LIBRARY_API_KEY
Value: (발급받은 인증키)
Environment: Production, Preview, Development 모두 선택
```

4. **Save** 후 **Redeploy**

### 로컬 개발 환경 설정

`.env.local` 파일에 추가:

```env
LIBRARY_API_KEY=발급받은_인증키
```

## 3. API 사용 제한

- **기본**: 하루 500회 호출 가능
- **서버 IP 등록 시**: 하루 30,000회까지 가능
  - 마이페이지 → 인증키 관리 → 서버 IP 등록

## 4. 사용하는 API

### 서지정보 상세검색 API (`srchDtlList`)
- 책 제목으로 검색
- JSON 형식 응답
- 도서명, 저자, ISBN, 표지 이미지 제공

### API 엔드포인트
```
http://data4library.kr/api/srchDtlList
```

### 파라미터
- `authKey`: 발급받은 인증키
- `title`: 검색할 책 제목
- `pageNo`: 페이지 번호 (기본: 1)
- `pageSize`: 페이지당 결과 수 (기본: 10)
- `format`: 응답 형식 (json 또는 xml)

## 5. 알라딘 API와의 차이점

### 장점
- ✅ 서버 사이드 호출 지원 (Referer 헤더 제한 없음)
- ✅ 무료 사용 가능
- ✅ CORS 제한 없음
- ✅ 공공 데이터 (안정적)

### 주의사항
- 일일 호출 제한 (500회 기본)
- 서버 IP 등록 시 더 많은 호출 가능

## 6. 테스트 방법

1. `/record` 페이지 접속
2. "책 검색하기" 버튼 클릭
3. 책 제목 입력 (예: "해리포터")
4. 검색 결과 확인

