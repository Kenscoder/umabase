-- Policies for characters
CREATE POLICY "Allow public read" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.characters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.characters FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.characters FOR DELETE USING (true);

-- Policies for teams
CREATE POLICY "Allow public read" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.teams FOR DELETE USING (true);

-- Policies for trainers
CREATE POLICY "Allow public read" ON public.trainers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.trainers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.trainers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.trainers FOR DELETE USING (true);

-- Policies for npcs
CREATE POLICY "Allow public read" ON public.npcs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.npcs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.npcs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.npcs FOR DELETE USING (true);

-- Policies for rivals
CREATE POLICY "Allow public read" ON public.rivals FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.rivals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.rivals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.rivals FOR DELETE USING (true);