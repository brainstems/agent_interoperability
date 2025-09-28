'use client'

import { useState, useEffect } from 'react'
import { 
  PhotoIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface PhotoGallery {
  id: string
  name: string
  description: string
  isPublic: boolean
  eventId?: string
  createdAt: string
  _count: {
    photos: number
  }
  event?: {
    title: string
  }
}

interface Photo {
  id: string
  filename: string
  originalName: string
  caption?: string
  url: string
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: {
    firstName: string
    lastName: string
  }
}

export default function PhotosPage() {
  const [galleries, setGalleries] = useState<PhotoGallery[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedGallery, setSelectedGallery] = useState<PhotoGallery | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPublic, setFilterPublic] = useState<string>('all')
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [editingGallery, setEditingGallery] = useState<PhotoGallery | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalGalleries: 0,
    totalPhotos: 0,
    publicGalleries: 0,
    storageUsed: 0
  })

  useEffect(() => {
    fetchGalleries()
  }, [searchTerm, filterPublic])

  const fetchGalleries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterPublic !== 'all') params.append('isPublic', filterPublic)
      params.append('include', 'photos,event')

      const response = await fetch(`/api/photos?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setGalleries(data.galleries)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch galleries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPhotos = async (galleryId: string) => {
    try {
      const response = await fetch(`/api/photos?galleryId=${galleryId}&include=uploadedBy`)
      const data = await response.json()
      
      if (data.success) {
        setPhotos(data.photos)
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    }
  }

  const handleCreateGallery = async (galleryData: any) => {
    try {
      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gallery',
          ...galleryData
        })
      })

      if (response.ok) {
        setShowGalleryModal(false)
        setEditingGallery(null)
        fetchGalleries()
      }
    } catch (error) {
      console.error('Failed to create gallery:', error)
    }
  }

  const handleUpdateGallery = async (galleryData: any) => {
    if (!editingGallery) return

    try {
      const response = await fetch('/api/photos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gallery',
          id: editingGallery.id,
          ...galleryData
        })
      })

      if (response.ok) {
        setShowGalleryModal(false)
        setEditingGallery(null)
        fetchGalleries()
      }
    } catch (error) {
      console.error('Failed to update gallery:', error)
    }
  }

  const handleDeleteGallery = async (galleryId: string) => {
    if (!confirm('Are you sure you want to delete this gallery and all its photos?')) return

    try {
      const response = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gallery',
          id: galleryId
        })
      })

      if (response.ok) {
        fetchGalleries()
      }
    } catch (error) {
      console.error('Failed to delete gallery:', error)
    }
  }

  const handleUploadPhotos = async (files: FileList, galleryId: string, captions: string[]) => {
    try {
      const formData = new FormData()
      formData.append('type', 'photo')
      formData.append('galleryId', galleryId)
      
      Array.from(files).forEach((file, index) => {
        formData.append('photos', file)
        if (captions[index]) {
          formData.append(`caption_${index}`, captions[index])
        }
      })

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        setShowUploadModal(false)
        if (selectedGallery) {
          fetchPhotos(selectedGallery.id)
        }
        fetchGalleries()
      }
    } catch (error) {
      console.error('Failed to upload photos:', error)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const response = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          id: photoId
        })
      })

      if (response.ok) {
        if (selectedGallery) {
          fetchPhotos(selectedGallery.id)
        }
        fetchGalleries()
      }
    } catch (error) {
      console.error('Failed to delete photo:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Photo Gallery Management</h1>
          <p className="mt-2 text-gray-600">Manage photo galleries and uploads for events and ministries</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <PhotoIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Galleries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGalleries}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <PhotoIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Photos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Public Galleries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.publicGalleries}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CloudArrowUpIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.storageUsed)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search galleries..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <select
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filterPublic}
                    onChange={(e) => setFilterPublic(e.target.value)}
                  >
                    <option value="all">All Galleries</option>
                    <option value="true">Public Only</option>
                    <option value="false">Private Only</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingGallery(null)
                  setShowGalleryModal(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Gallery
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Grid or Photo View */}
        {selectedGallery ? (
          <PhotoGalleryView
            gallery={selectedGallery}
            photos={photos}
            onBack={() => {
              setSelectedGallery(null)
              setPhotos([])
            }}
            onUpload={() => setShowUploadModal(true)}
            onViewPhoto={(photo) => {
              setSelectedPhoto(photo)
              setShowPhotoModal(true)
            }}
            onDeletePhoto={handleDeletePhoto}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
              <div key={gallery.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{gallery.name}</h3>
                    <div className="flex items-center gap-2">
                      {gallery.isPublic && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Public
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedGallery(gallery)
                            fetchPhotos(gallery.id)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="View Photos"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingGallery(gallery)
                            setShowGalleryModal(true)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit Gallery"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGallery(gallery.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete Gallery"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {gallery.description && (
                    <p className="text-gray-600 text-sm mb-4">{gallery.description}</p>
                  )}
                  
                  {gallery.event && (
                    <p className="text-blue-600 text-sm mb-4">Event: {gallery.event.title}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{gallery._count.photos} photos</span>
                    <span>{new Date(gallery.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gallery Modal */}
        {showGalleryModal && (
          <GalleryModal
            gallery={editingGallery}
            onSave={editingGallery ? handleUpdateGallery : handleCreateGallery}
            onClose={() => {
              setShowGalleryModal(false)
              setEditingGallery(null)
            }}
          />
        )}

        {/* Upload Modal */}
        {showUploadModal && selectedGallery && (
          <UploadModal
            gallery={selectedGallery}
            onUpload={handleUploadPhotos}
            onClose={() => setShowUploadModal(false)}
          />
        )}

        {/* Photo Modal */}
        {showPhotoModal && selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={() => {
              setShowPhotoModal(false)
              setSelectedPhoto(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// Photo Gallery View Component
function PhotoGalleryView({ 
  gallery, 
  photos, 
  onBack, 
  onUpload, 
  onViewPhoto, 
  onDeletePhoto 
}: {
  gallery: PhotoGallery
  photos: Photo[]
  onBack: () => void
  onUpload: () => void
  onViewPhoto: (photo: Photo) => void
  onDeletePhoto: (photoId: string) => void
}) {
  return (
    <div>
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Back to Galleries
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{gallery.name}</h2>
                {gallery.description && (
                  <p className="text-gray-600">{gallery.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onUpload}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Upload Photos
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden group">
            <div className="aspect-square relative">
              <img
                src={photo.thumbnailUrl || photo.url}
                alt={photo.caption || photo.originalName}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onViewPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => onViewPhoto(photo)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeletePhoto(photo.id)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            {photo.caption && (
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Gallery Modal Component
function GalleryModal({ 
  gallery, 
  onSave, 
  onClose 
}: {
  gallery: PhotoGallery | null
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: gallery?.name || '',
    description: gallery?.description || '',
    isPublic: gallery?.isPublic || false,
    eventId: gallery?.eventId || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {gallery ? 'Edit Gallery' : 'Create New Gallery'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gallery Name
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                Make this gallery public
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {gallery ? 'Update' : 'Create'} Gallery
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Upload Modal Component
function UploadModal({ 
  gallery, 
  onUpload, 
  onClose 
}: {
  gallery: PhotoGallery
  onUpload: (files: FileList, galleryId: string, captions: string[]) => void
  onClose: () => void
}) {
  const [files, setFiles] = useState<FileList | null>(null)
  const [captions, setCaptions] = useState<string[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      setFiles(selectedFiles)
      setCaptions(Array(selectedFiles.length).fill(''))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (files) {
      onUpload(files, gallery.id, captions)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Photos to {gallery.name}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Photos
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                onChange={handleFileChange}
              />
            </div>

            {files && Array.from(files).map((file, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <input
                      type="text"
                      placeholder="Optional caption..."
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-1 text-sm"
                      value={captions[index]}
                      onChange={(e) => {
                        const newCaptions = [...captions]
                        newCaptions[index] = e.target.value
                        setCaptions(newCaptions)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Upload Photos
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Photo Modal Component
function PhotoModal({ 
  photo, 
  onClose 
}: {
  photo: Photo
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="max-w-4xl max-h-[90vh] mx-4">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
          <img
            src={photo.url}
            alt={photo.caption || photo.originalName}
            className="max-w-full max-h-[80vh] object-contain"
          />
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
              <p className="text-center">{photo.caption}</p>
            </div>
          )}
        </div>
        <div className="bg-white p-4 mt-2 rounded">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Uploaded by {photo.uploadedBy.firstName} {photo.uploadedBy.lastName}</span>
            <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
