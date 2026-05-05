"""
Generate sample test rock images with different faces and angles.
This script creates synthetic rock-like images for testing the analyzer.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os
from pathlib import Path
import random

class TestRockGenerator:
    """Generate synthetic test rock images with different faces"""
    
    def __init__(self, output_dir='data/test_rocks'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def create_granite_face(self, size=224, face_type='top'):
        """Create a granite-like rock face"""
        img = Image.new('RGB', (size, size), (180, 170, 160))
        pixels = img.load()
        
        # Add granite-like texture
        np.random.seed(hash(face_type) % 2**32)
        for i in range(size):
            for j in range(size):
                noise = np.random.randint(-20, 20)
                color = max(0, min(255, 180 + noise))
                pixels[i, j] = (color, color-5, color-10)
        
        # Add speckles
        for _ in range(500):
            x, y = random.randint(0, size-1), random.randint(0, size-1)
            pixels[x, y] = (200, 190, 180)
        
        # Add some cracks/lines based on face
        draw = ImageDraw.Draw(img)
        if face_type == 'top':
            draw.line([(0, size//2), (size, size//2)], fill=(100, 100, 100), width=2)
            draw.line([(size//3, 0), (size//3, size//2)], fill=(120, 120, 120), width=2)
        elif face_type == 'side':
            draw.line([(0, size//4), (size, size//3)], fill=(100, 100, 100), width=2)
            draw.line([(size//2, 0), (size//2, size)], fill=(110, 110, 110), width=2)
        elif face_type == 'front':
            draw.line([(0, 0), (size, size)], fill=(100, 100, 100), width=2)
            draw.line([(size//2, size//2), (size, size)], fill=(110, 110, 110), width=2)
        elif face_type == 'bottom':
            draw.polygon([(0, 0), (size, 0), (size//2, size)], fill=(170, 160, 150), outline=(100, 100, 100))
        
        return img.filter(ImageFilter.GaussianBlur(radius=1))
    
    def create_basalt_face(self, size=224, face_type='top'):
        """Create a basalt-like rock face (darker)"""
        img = Image.new('RGB', (size, size), (60, 60, 65))
        pixels = img.load()
        
        # Add basalt-like texture (dark with variations)
        np.random.seed(hash(f"basalt_{face_type}") % 2**32)
        for i in range(size):
            for j in range(size):
                noise = np.random.randint(-30, 15)
                color = max(0, min(255, 60 + noise))
                pixels[i, j] = (color, color, color + 5)
        
        # Add larger dark speckles
        for _ in range(300):
            x, y = random.randint(0, size-1), random.randint(0, size-1)
            pixels[x, y] = (40, 40, 45)
        
        # Add structural lines
        draw = ImageDraw.Draw(img)
        if face_type == 'top':
            draw.line([(size//4, 0), (3*size//4, size)], fill=(30, 30, 35), width=3)
        elif face_type == 'side':
            draw.line([(0, 0), (size, size)], fill=(35, 35, 40), width=2)
            draw.line([(0, size//2), (size, size//2)], fill=(40, 40, 45), width=2)
        
        return img.filter(ImageFilter.GaussianBlur(radius=1))
    
    def create_limestone_face(self, size=224, face_type='top'):
        """Create a limestone-like rock face (lighter, sedimentary)"""
        img = Image.new('RGB', (size, size), (210, 200, 190))
        pixels = img.load()
        
        # Add limestone-like texture
        np.random.seed(hash(f"limestone_{face_type}") % 2**32)
        for i in range(size):
            for j in range(size):
                noise = np.random.randint(-15, 15)
                color = max(0, min(255, 210 + noise))
                pixels[i, j] = (color, color - 5, color - 15)
        
        # Add fossils/patterns
        for _ in range(200):
            x, y = random.randint(0, size-20), random.randint(0, size-20)
            draw = ImageDraw.Draw(img)
            draw.ellipse([x, y, x+15, y+15], outline=(150, 140, 130))
        
        # Add weathering patterns
        if face_type == 'front':
            for _ in range(10):
                x = random.randint(0, size-50)
                draw = ImageDraw.Draw(img)
                draw.ellipse([x, 0, x+50, 100], fill=(150, 140, 130, 20), outline=(160, 150, 140))
        
        return img.filter(ImageFilter.GaussianBlur(radius=0.5))
    
    def create_marble_face(self, size=224, face_type='top'):
        """Create a marble-like rock face (metamorphic with veins)"""
        img = Image.new('RGB', (size, size), (240, 235, 230))
        pixels = img.load()
        
        # Base color with variation
        np.random.seed(hash(f"marble_{face_type}") % 2**32)
        for i in range(size):
            for j in range(size):
                noise = np.random.randint(-10, 10)
                color = max(0, min(255, 240 + noise))
                pixels[i, j] = (color, color - 2, color - 5)
        
        # Add marble veins
        draw = ImageDraw.Draw(img)
        for _ in range(5):
            points = []
            x, y = random.randint(0, size), random.randint(0, size)
            for _ in range(10):
                points.append((x + random.randint(-50, 50), y + random.randint(-30, 30)))
            if len(points) > 1:
                draw.line(points, fill=(180, 170, 160), width=3)
        
        return img.filter(ImageFilter.GaussianBlur(radius=1.5))
    
    def generate_all_samples(self):
        """Generate test samples for all rock types with different faces"""
        rock_types = {
            'Igneous_Granite': self.create_granite_face,
            'Igneous_Basalt': self.create_basalt_face,
            'Sedimentary_Limestone': self.create_limestone_face,
            'Metamorphic_Marble': self.create_marble_face,
        }
        
        faces = ['top', 'side', 'front', 'bottom']
        
        for rock_name, generator in rock_types.items():
            rock_dir = self.output_dir / rock_name
            rock_dir.mkdir(parents=True, exist_ok=True)
            
            for i, face in enumerate(faces):
                img = generator(face_type=face)
                
                # Save with face name
                filename = f"{rock_name}_{face}_{i+1}.png"
                filepath = rock_dir / filename
                img.save(filepath)
                print(f"✓ Generated: {filepath}")
        
        print(f"\nTest samples generated in: {self.output_dir}")
        print("You can now use these with the Rock Analyzer!")
    
    def generate_multi_face_sample(self, rock_type='Granite', output_filename='multi_face_granite.png'):
        """Generate a composite image showing multiple faces of the same rock"""
        size = 224
        composite = Image.new('RGB', (size*2, size*2), (255, 255, 255))
        
        generator = self.create_granite_face
        if 'basalt' in rock_type.lower():
            generator = self.create_basalt_face
        elif 'limestone' in rock_type.lower():
            generator = self.create_limestone_face
        elif 'marble' in rock_type.lower():
            generator = self.create_marble_face
        
        faces = ['top', 'side', 'front', 'bottom']
        positions = [(0, 0), (size, 0), (0, size), (size, size)]
        
        for face, pos in zip(faces, positions):
            img = generator(face_type=face)
            composite.paste(img, pos)
        
        # Add labels
        draw = ImageDraw.Draw(composite)
        labels = ['TOP', 'SIDE', 'FRONT', 'BOTTOM']
        positions_text = [(size//2, 10), (size + size//2, 10), (size//2, size + 10), (size + size//2, size + 10)]
        
        for label, pos in zip(labels, positions_text):
            draw.text(pos, label, fill=(0, 0, 0))
        
        filepath = self.output_dir / output_filename
        composite.save(filepath)
        print(f"✓ Multi-face composite saved: {filepath}")
        
        return filepath


if __name__ == '__main__':
    generator = TestRockGenerator()
    
    print("🪨 Generating test rock samples...")
    generator.generate_all_samples()
    
    print("\n📐 Generating multi-face composites...")
    generator.generate_multi_face_sample('Granite', 'multi_face_granite.png')
    generator.generate_multi_face_sample('Basalt', 'multi_face_basalt.png')
    generator.generate_multi_face_sample('Limestone', 'multi_face_limestone.png')
    generator.generate_multi_face_sample('Marble', 'multi_face_marble.png')
    
    print("\n✅ All test samples generation complete!")
