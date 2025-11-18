-- approve_record_and_reward 함수 수정: 작성 항목에 따라 포인트 지급
-- 별점만: +2점, 별점+한줄소감: +3점, 별점+감상: +7점, 별점+한줄소감+감상: +8점
-- 별점+사진: +4점, 별점+한줄소감+사진: +5점, 별점+감상+사진: +9점, 모두: +10점
create or replace function public.approve_record_and_reward(p_record_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_leaves integer;
  v_target integer;
  v_book_title text;
  v_old_level integer;
  v_new_level integer;
  v_approved_count integer;
  v_rating integer;
  v_short_comment text;
  v_content_text text;
  v_content_image_url text;
  v_points_to_award integer := 0;
begin
  -- 기록 정보 가져오기
  select 
    user_id, 
    book_title,
    rating,
    short_comment,
    content_text,
    content_image_url
  into 
    v_user_id, 
    v_book_title,
    v_rating,
    v_short_comment,
    v_content_text,
    v_content_image_url
  from public.book_records
  where id = p_record_id and status = 'pending';
  
  if not found then
    raise exception 'record not found or not pending';
  end if;

  -- 포인트 계산 (작성한 항목에 따라)
  -- 별점만: +2점
  if v_rating is not null and v_short_comment is null and v_content_text is null and v_content_image_url is null then
    v_points_to_award := 2;
  -- 별점 + 한 줄 소감: +3점
  elsif v_rating is not null and v_short_comment is not null and v_content_text is null and v_content_image_url is null then
    v_points_to_award := 3;
  -- 별점 + 감상: +7점
  elsif v_rating is not null and v_short_comment is null and v_content_text is not null and v_content_image_url is null then
    v_points_to_award := 7;
  -- 별점 + 한 줄 소감 + 감상: +8점
  elsif v_rating is not null and v_short_comment is not null and v_content_text is not null and v_content_image_url is null then
    v_points_to_award := 8;
  -- 별점 + 사진: +4점
  elsif v_rating is not null and v_short_comment is null and v_content_text is null and v_content_image_url is not null then
    v_points_to_award := 4;
  -- 별점 + 한 줄 소감 + 사진: +5점
  elsif v_rating is not null and v_short_comment is not null and v_content_text is null and v_content_image_url is not null then
    v_points_to_award := 5;
  -- 별점 + 감상 + 사진: +9점
  elsif v_rating is not null and v_short_comment is null and v_content_text is not null and v_content_image_url is not null then
    v_points_to_award := 9;
  -- 별점 + 한 줄 소감 + 감상 + 사진: +10점
  elsif v_rating is not null and v_short_comment is not null and v_content_text is not null and v_content_image_url is not null then
    v_points_to_award := 10;
  -- 별점이 없으면 기본 0점 (별점은 필수로 가정)
  else
    v_points_to_award := 0;
  end if;

  -- 학생 현재 레벨 저장 (레벨업 체크용)
  select level into v_old_level from public.profiles where id = v_user_id;

  -- 기록 승인 처리
  update public.book_records
    set status = 'approved', approved_at = now()
    where id = p_record_id;

  -- 학생 포인트 지급 (계산된 포인트)
  update public.profiles set points = points + v_points_to_award where id = v_user_id;

  -- 학생 개인 레벨업 체크 (승인된 기록 수 기준: 5개마다 레벨업)
  select count(*) into v_approved_count
  from public.book_records
  where user_id = v_user_id and status = 'approved';
  
  -- 승인된 기록 수에 따라 레벨 계산 (5개마다 레벨 1 증가, 최소 레벨 1)
  v_new_level := greatest(1, (v_approved_count / 5) + 1);
  
  -- 레벨이 올라갔으면 업데이트
  if v_new_level > v_old_level then
    update public.profiles set level = v_new_level where id = v_user_id;
    
    -- 개인 레벨업 알림 생성
    perform public.create_notification(
      v_user_id,
      'level_up',
      '🎉 레벨업 축하해요!',
      format('축하합니다! 레벨 %s로 올라갔어요!', v_new_level),
      null
    );
  end if;

  -- 승인 알림 생성 (포인트 정보 포함)
  perform public.create_notification(
    v_user_id,
    'approval',
    '✅ 독서 기록이 승인되었어요!',
    format('"%s" 독서 기록이 승인되어 물방울 %s점을 받았어요!', coalesce(v_book_title, '독서 기록'), v_points_to_award),
    p_record_id
  );

  -- 반 나무는 단일 행 사용 가정: 첫 행에 +1
  update public.class_trees 
    set current_leaves = current_leaves + 1
    where id = (select id from public.class_trees order by id limit 1);

  -- 반 나무 레벨업 체크
  select current_leaves, level_up_target, current_level into v_leaves, v_target, v_old_level
    from public.class_trees 
    order by id limit 1;
    
  if v_leaves >= v_target then
    update public.class_trees
      set current_level = current_level + 1,
          current_leaves = 0
      where id = (select id from public.class_trees order by id limit 1);
    
    -- 반 나무 레벨업 알림 생성 (모든 학생에게)
    perform public.create_notification(
      profile.id,
      'level_up',
      '🌳 우리 반 나무가 레벨업했어요!',
      format('축하합니다! 반 나무가 레벨 %s로 올라갔어요!', v_old_level + 1),
      null
    )
    from public.profiles profile
    where profile.role = 'student';
  end if;
end;
$$;

