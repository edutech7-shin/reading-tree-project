-- class_students 테이블 데이터 확인 쿼리
-- teacher1의 반에 소속된 모든 학생 확인

select 
  cs.id,
  cs.name as 학생이름,
  cs.student_number as 번호,
  cs.teacher_id,
  p_teacher.name as 교사이름,
  p_student.id as 프로필_id,
  case when p_student.id is not null then '있음' else '없음' end as profiles_등록여부
from public.class_students cs
join public.profiles p_teacher on p_teacher.id = cs.teacher_id
left join public.profiles p_student on p_student.name = cs.name and p_student.role = 'student'
where p_teacher.name = 'teacher1' or p_teacher.id in (
  select id from public.profiles 
  where role = 'teacher' 
  order by created_at 
  limit 1
)
order by cs.student_number;

-- teacher1의 반 학생 수 확인
select 
  count(*) as 총_학생수,
  count(distinct cs.name) as 고유_학생수
from public.class_students cs
join public.profiles p_teacher on p_teacher.id = cs.teacher_id
where p_teacher.name = 'teacher1' or p_teacher.id in (
  select id from public.profiles 
  where role = 'teacher' 
  order by created_at 
  limit 1
);

