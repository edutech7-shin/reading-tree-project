# Windows PC에서 프로젝트 설정 가이드

이 가이드는 Mac에서 작업하던 프로젝트를 Windows PC에서 동일하게 설정하는 방법을 안내합니다.

## 필수 사전 준비사항

### 1. 개발 도구 설치

#### Node.js 설치
- [Node.js 공식 사이트](https://nodejs.org/)에서 LTS 버전 다운로드 및 설치
- 설치 후 터미널(명령 프롬프트 또는 PowerShell)에서 확인:
```bash
node --version
npm --version
```

#### Git 설치 (아직 설치하지 않았다면)
- [Git 공식 사이트](https://git-scm.com/download/win)에서 다운로드 및 설치
- 설치 후 확인:
```bash
git --version
```

### 2. 코드 에디터 선택
- **VS Code** (권장): [VS Code 다운로드](https://code.visualstudio.com/)
- 또는 IntelliJ IDEA, WebStorm 등 원하는 에디터 사용

## 프로젝트 설정 단계

### 1단계: 프로젝트 클론 또는 다운로드

#### 방법 A: Git 저장소에서 클론 (권장)
```bash
# 원하는 폴더로 이동 (예: C:\Users\YourName\Documents)
cd C:\Users\YourName\Documents

# Git 저장소 클론 (저장소 URL을 사용)
git clone <저장소-URL> reading-tree-project
cd reading-tree-project
```

#### 방법 B: USB/클라우드 드라이브로 복사
- Mac에서 프로젝트 폴더 전체를 USB나 클라우드 드라이브(Google Drive, Dropbox 등)로 복사
- Windows PC에서 프로젝트 폴더를 원하는 위치에 복사

### 2단계: 환경 변수 설정

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성합니다.

**중요**: `.env.local` 파일은 Git에 포함되지 않으므로 Mac에서 직접 복사하거나, 환경 변수 값을 별도로 보관해야 합니다.

#### `.env.local` 파일 생성 방법

1. 프로젝트 루트 폴더에서 새 파일 생성 (예: 메모장으로)
2. 파일명을 정확히 `.env.local`로 저장 (확장자 없음)
3. 다음 내용을 입력 (Mac에서 사용하던 값으로 교체):

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 서버 사이드용 (필요한 경우)
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Aladin API 키 (사용하는 경우)
ALADIN_API_KEY=your-aladin-api-key
```

**참고**: 
- Mac에서 `.env.local` 파일의 내용을 확인하려면 터미널에서 `cat .env.local` 명령 사용
- 또는 VS Code에서 `.env.local` 파일을 직접 열어 확인

### 3단계: 의존성 설치

프로젝트 폴더에서 터미널(명령 프롬프트 또는 PowerShell)을 열고 실행:

```bash
npm install
```

이 명령은 `package.json`에 정의된 모든 패키지를 설치합니다.

### 4단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하면 프로젝트가 실행됩니다.

## 추가 설정 (필요한 경우)

### Supabase CLI (로컬 개발 시)

로컬 Supabase를 사용하려면:

```bash
# Supabase CLI 설치
npm install -g supabase

# 또는 Scoop 사용 (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### TypeScript 설정 확인

프로젝트는 이미 TypeScript로 설정되어 있으므로 별도 설정 불필요합니다.

## 문제 해결

### 포트 3000이 이미 사용 중인 경우
다른 포트로 실행:
```bash
# PowerShell에서
$env:PORT=3001; npm run dev

# 또는 명령 프롬프트에서
set PORT=3001 && npm run dev
```

### 환경 변수가 인식되지 않는 경우
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 파일명이 정확히 `.env.local`인지 확인 (`.env.local.txt`가 아님)
3. 개발 서버를 재시작 (`Ctrl+C`로 종료 후 다시 `npm run dev`)

### node_modules 폴더 문제
```bash
# node_modules 삭제 후 재설치
rmdir /s /q node_modules
npm install
```

### Git 관련 문제
Windows에서 줄바꿈(CRLF vs LF) 문제가 발생할 수 있습니다:
```bash
# Git 설정 확인 및 수정
git config --global core.autocrlf true
```

## Windows에서 작업할 때 주의사항

1. **파일 경로**: Windows는 백슬래시(`\`)를 사용하지만, 코드에서는 슬래시(`/`)를 사용해도 됩니다 (Node.js가 자동 변환)

2. **환경 변수**: PowerShell과 명령 프롬프트에서 환경 변수 설정 방법이 다릅니다:
   - PowerShell: `$env:VARIABLE_NAME="value"`
   - 명령 프롬프트: `set VARIABLE_NAME=value`

3. **터미널**: PowerShell 사용을 권장합니다 (더 강력한 기능 제공)

4. **Git 커밋**: Mac과 Windows 간 작업 시 `.gitattributes` 파일을 추가하여 줄바꿈을 통일할 수 있습니다

## 빌드 및 배포

### 프로덕션 빌드 테스트
```bash
npm run build
npm start
```

### 배포
- Vercel, Netlify 등 플랫폼에 배포할 때는 환경 변수를 해당 플랫폼의 설정에서 추가해야 합니다

## 체크리스트

Windows PC에서 설정할 때 다음을 확인하세요:

- [ ] Node.js 설치 완료
- [ ] Git 설치 완료 (또는 프로젝트 복사 완료)
- [ ] `.env.local` 파일 생성 및 환경 변수 설정
- [ ] `npm install` 실행 완료
- [ ] `npm run dev` 실행 후 `http://localhost:3000` 접속 확인
- [ ] 로그인/인증 기능 테스트
- [ ] 데이터베이스 연결 확인

## 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [Git for Windows](https://git-scm.com/download/win)

