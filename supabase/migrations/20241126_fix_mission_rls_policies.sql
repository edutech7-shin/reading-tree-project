-- mission_assignments와 missions의 RLS 정책에서 무한 재귀 방지
-- 보안 정의자 함수를 사용하여 class_students 조회 시 재귀 방지

-- missions 테이블: 학생이 자신의 교사가 생성한 미션 조회 가능 (함수 사용으로 재귀 방지)
drop policy if exists "missions student select" on public.missions;
create policy "missions student select" on public.missions
  for select using (
    -- 현재 사용자가 학생이고, 같은 teacher_id를 가진 미션인지 확인
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
    and public.get_current_student_teacher_id() = public.missions.teacher_id
    and public.get_current_student_teacher_id() is not null
  );

-- mission_assignments 테이블: 학생이 자신에게 할당된 미션 조회 가능 (함수 사용으로 재귀 방지)
drop policy if exists "mission_assignments student select" on public.mission_assignments;
create policy "mission_assignments student select" on public.mission_assignments
  for select using (
    -- 현재 사용자가 학생이고, 할당된 미션의 student_id가 자신인지 확인
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
    and (
      -- student_id(class_students.id)의 teacher_id가 현재 학생의 teacher_id와 같은지 확인
      public.get_current_student_teacher_id() = public.get_completion_student_teacher_id(mission_assignments.student_id)
      and public.get_current_student_teacher_id() is not null
    )
  );

