-- Drop existing check constraint if it exists
ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_category_check;

-- Add updated check constraint with correct categories
ALTER TABLE public.complaints 
ADD CONSTRAINT complaints_category_check 
CHECK (category IN ('Admin', 'Mentor', 'Academic Counsellor', 'Working Hub', 'Peer', 'Other'));