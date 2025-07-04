'use client';

import { useRouter } from 'next/navigation';
import { useProjects } from '../api/hooks/useProjects';

export default function Home() {
  const router = useRouter();
  //
  const { data: projects = [], isLoading, error, refetch } = useProjects();

  const handleCreateProject = () => {
    router.push('/create-project');
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-8 border-red-200 bg-red-50">
          <p className="text-red-600 mb-4">Error loading projects</p>
          <button onClick={() => refetch()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <button onClick={handleCreateProject} className="btn-primary">
          Create New Project
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Projects ({projects.length})</h2>
            <button onClick={() => refetch()} className="btn-secondary">
              Refresh
            </button>
          </div>
          
          {projects.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-600 mb-4">No projects found</p>
              <button onClick={handleCreateProject} className="btn-primary">
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="card hover:shadow-lg transition-all duration-200 cursor-pointer hover-lift"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <h3 className="font-bold text-lg mb-2">{project.name}</h3>
                  {project.description && (
                    <p className="text-gray-700 mb-3">{project.description}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
