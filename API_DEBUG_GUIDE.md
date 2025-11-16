# API 응답 확인 가이드

## 방법 1: 브라우저 개발자 도구 콘솔 확인 (가장 쉬운 방법)

1. **브라우저에서 F12 키를 눌러 개발자 도구를 엽니다**
2. **Console 탭을 선택합니다**
3. **책 검색을 실행합니다**
4. **콘솔에 다음과 같은 로그가 나타납니다:**
   - `[BookSearch] Response:` - 전체 API 응답
   - `[BookSearch] 첫 번째 책의 상세 정보:` - 첫 번째 책의 모든 데이터
   - `[BookSearch] 첫 번째 책의 필드:` - 사용 가능한 필드 목록
   - `[BookSearch] ISBN:` - ISBN 값
   - `[BookSearch] 출판사:` - 출판사 값
   - `[BookSearch] 출판연도:` - 출판연도 값
   - `[BookSearch] 페이지 수:` - 페이지 수 값

## 방법 2: Network 탭에서 직접 확인

1. **브라우저에서 F12 키를 눌러 개발자 도구를 엽니다**
2. **Network 탭을 선택합니다**
3. **책 검색을 실행합니다**
4. **`/api/books/search?q=...` 요청을 찾아 클릭합니다**
5. **Response 탭을 클릭하면 실제 API 응답을 JSON 형식으로 볼 수 있습니다**

## 방법 3: 서버 로그 확인 (로컬 개발 환경)

로컬에서 `npm run dev`로 개발 서버를 실행한 경우:

1. **터미널에서 개발 서버를 실행합니다:**
   ```bash
   npm run dev
   ```

2. **책 검색을 실행하면 터미널에 다음과 같은 로그가 나타납니다:**
   - `[Book Search] First book complete structure:` - 첫 번째 책의 전체 구조
   - `[Book Search] First book available fields:` - 사용 가능한 필드 목록
   - `[Book Search] Book data fields:` - 각 책의 필드별 값

## 확인할 내용

다음 필드들이 실제로 API 응답에 포함되어 있는지 확인하세요:

- ✅ **ISBN**: `isbn13` 필드
- ✅ **출판사**: `publisher` 필드  
- ✅ **출판연도**: `publication_year` 필드
- ❓ **페이지 수**: `page`, `pages`, `totalPages`, `pageCount` 등 (도서관 정보나루 API에서는 제공하지 않을 수 있음)

## 문제 해결

만약 필드가 `null`로 나온다면:
1. 도서관 정보나루 API가 해당 정보를 제공하지 않는 것일 수 있습니다
2. 다른 API (예: 알라딘 API)를 사용해야 할 수도 있습니다
3. 브라우저 콘솔의 로그를 확인하여 실제 API 응답 구조를 확인하세요

