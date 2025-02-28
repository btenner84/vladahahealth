#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment process...${NC}"

# Check if git is initialized
if [ ! -d .git ]; then
  echo -e "${YELLOW}Initializing git repository...${NC}"
  git init
  
  # Ask for GitHub repository URL if not already set
  echo -e "${YELLOW}Enter your GitHub repository URL (e.g., https://github.com/username/repo.git):${NC}"
  read repo_url
  
  if [ -n "$repo_url" ]; then
    git remote add origin $repo_url
  else
    echo -e "${YELLOW}No repository URL provided. You'll need to add it manually later with:${NC}"
    echo "git remote add origin YOUR_REPO_URL"
  fi
else
  echo -e "${GREEN}Git repository already initialized.${NC}"
fi

# Stage all changes
echo -e "${YELLOW}Staging all changes...${NC}"
git add .

# Commit changes
echo -e "${YELLOW}Enter a commit message:${NC}"
read commit_message

if [ -z "$commit_message" ]; then
  commit_message="Update application files"
fi

git commit -m "$commit_message"

# Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin main || git push -u origin master

echo -e "${GREEN}Deployment process completed!${NC}"
echo -e "${YELLOW}If this is your first push and you see an error, you might need to:${NC}"
echo "1. Create a repository on GitHub first"
echo "2. Run: git branch -M main (if you want to use 'main' instead of 'master')"
echo "3. Run: git remote add origin YOUR_REPO_URL (if you haven't set it)"
echo "4. Run: git push -u origin main"