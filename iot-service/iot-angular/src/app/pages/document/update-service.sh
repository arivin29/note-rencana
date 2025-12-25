#!/bin/bash
# Backup original
cp services/tutorial/tutorial.service.ts services/tutorial/tutorial.service.ts.backup

# Read the existing service up to the registry
head -14 services/tutorial/tutorial.service.ts > services/tutorial/tutorial.service.tmp

# Add registry opening
echo "  // Tutorial metadata registry - map tutorial IDs to their metadata" >> services/tutorial/tutorial.service.tmp
echo "  private tutorialMetadataRegistry: TutorialMetadata[] = [" >> services/tutorial/tutorial.service.tmp
echo "    // Getting Started (existing)" >> services/tutorial/tutorial.service.tmp
echo "    {" >> services/tutorial/tutorial.service.tmp
echo "      id: 'getting-started-login'," >> services/tutorial/tutorial.service.tmp
echo "      title: 'Getting Started: Login to System'," >> services/tutorial/tutorial.service.tmp
echo "      description: 'Learn how to access the IoT Monitoring System'," >> services/tutorial/tutorial.service.tmp
echo "      category: TutorialCategory.GETTING_STARTED," >> services/tutorial/tutorial.service.tmp
echo "      difficulty: TutorialDifficulty.BEGINNER," >> services/tutorial/tutorial.service.tmp
echo "      estimatedTime: 3," >> services/tutorial/tutorial.service.tmp
echo "      roles: [UserRole.USER, UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN]," >> services/tutorial/tutorial.service.tmp
echo "      tags: ['login', 'authentication', 'access']," >> services/tutorial/tutorial.service.tmp
echo "      icon: 'bi-box-arrow-in-right'," >> services/tutorial/tutorial.service.tmp
echo "      order: 1," >> services/tutorial/tutorial.service.tmp
echo "    }," >> services/tutorial/tutorial.service.tmp
echo "    {" >> services/tutorial/tutorial.service.tmp
echo "      id: 'getting-started-first-login'," >> services/tutorial/tutorial.service.tmp
echo "      title: 'Getting Started: First Time Login Setup'," >> services/tutorial/tutorial.service.tmp
echo "      description: 'Complete guide for new users to set up their account on first login'," >> services/tutorial/tutorial.service.tmp
echo "      category: TutorialCategory.GETTING_STARTED," >> services/tutorial/tutorial.service.tmp
echo "      difficulty: TutorialDifficulty.BEGINNER," >> services/tutorial/tutorial.service.tmp
echo "      estimatedTime: 5," >> services/tutorial/tutorial.service.tmp
echo "      roles: [UserRole.USER, UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN]," >> services/tutorial/tutorial.service.tmp
echo "      tags: ['first-login', 'setup', 'profile', 'password', 'onboarding']," >> services/tutorial/tutorial.service.tmp
echo "      icon: 'bi-person-check'," >> services/tutorial/tutorial.service.tmp
echo "      order: 2," >> services/tutorial/tutorial.service.tmp
echo "    }," >> services/tutorial/tutorial.service.tmp

# Add generated metadata (remove last line which is comment)
head -n -1 tutorial-metadata-output.txt >> services/tutorial/tutorial.service.tmp

# Close registry
echo "  ];" >> services/tutorial/tutorial.service.tmp
echo "" >> services/tutorial/tutorial.service.tmp

# Add rest of the file (from line 42 onwards, skipping old registry)
tail -n +42 services/tutorial/tutorial.service.ts >> services/tutorial/tutorial.service.tmp

# Replace original
mv services/tutorial/tutorial.service.tmp services/tutorial/tutorial.service.ts

echo "✅ Tutorial service updated!"
