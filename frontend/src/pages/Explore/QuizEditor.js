import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import {
  ArrowLeft, Save, Eye, Loader2, X, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';

const emptyQuestion = {
  question: { en: '', id: '' },
  options: { en: ['', '', '', ''], id: ['', '', '', ''] },
  correct_answer: 0,
  explanation: { en: '', id: '' },
};

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    title: { en: '', id: '' },
    description: { en: '', id: '' },
    difficulty: 'medium',
    category: { en: '', id: '' },
    questions: [],
    time_limit_seconds: 300,
    pass_percentage: 70,
    image_url: '',
    published: false,
    scheduled_date: '',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Fetch existing quiz if editing
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['explore', 'quiz', id],
    queryFn: () => exploreService.getContent('quiz', id),
    enabled: isEditMode,
    onSuccess: (data) => {
      setFormData({
        title: data.title || { en: '', id: '' },
        description: data.description || { en: '', id: '' },
        difficulty: data.difficulty || 'medium',
        category: data.category || { en: '', id: '' },
        questions: data.questions || [],
        time_limit_seconds: data.time_limit_seconds || 300,
        pass_percentage: data.pass_percentage || 70,
        image_url: data.image_url || '',
        published: data.published || false,
        scheduled_date: data.scheduled_date || '',
      });
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEditMode) {
        return exploreService.updateContent('quiz', id, data);
      } else {
        return exploreService.createContent('quiz', data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['explore', 'content', 'quiz']);
      toast({
        title: 'Success',
        description: isEditMode ? 'Quiz updated successfully' : 'Quiz created successfully',
      });
      navigate('/content-center/quiz');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save quiz',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field, value, language = null) => {
    if (language) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { ...emptyQuestion }]
    }));
    setExpandedQuestion(formData.questions.length);
  };

  const handleRemoveQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    if (expandedQuestion === index) {
      setExpandedQuestion(null);
    }
  };

  const handleQuestionChange = (questionIndex, field, value, language = null, optionIndex = null) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      const question = { ...newQuestions[questionIndex] };

      if (optionIndex !== null) {
        // Update option
        question.options = { ...question.options };
        question.options[language] = [...question.options[language]];
        question.options[language][optionIndex] = value;
      } else if (language) {
        // Update language-specific field
        question[field] = { ...question[field], [language]: value };
      } else {
        // Update non-language field
        question[field] = value;
      }

      newQuestions[questionIndex] = question;
      return { ...prev, questions: newQuestions };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English title is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one question is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate each question
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.en.trim()) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1}: English question text is required`,
          variant: 'destructive',
        });
        return;
      }
      if (q.options.en.some(opt => !opt.trim())) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1}: All English options must be filled`,
          variant: 'destructive',
        });
        return;
      }
    }

    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/content-center/quiz"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Quizzes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Quiz' : 'Create New Quiz'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/public/explore/quiz/${id}`, '_blank')}
            disabled={!isEditMode}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the quiz title and description</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="title-en">Title (English) *</Label>
                  <Input
                    id="title-en"
                    value={formData.title.en}
                    onChange={(e) => handleInputChange('title', e.target.value, 'en')}
                    placeholder="Enter quiz title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description-en">Description (English)</Label>
                  <Textarea
                    id="description-en"
                    value={formData.description.en}
                    onChange={(e) => handleInputChange('description', e.target.value, 'en')}
                    placeholder="Brief description of the quiz"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category-en">Category (English)</Label>
                  <Input
                    id="category-en"
                    value={formData.category.en}
                    onChange={(e) => handleInputChange('category', e.target.value, 'en')}
                    placeholder="e.g., Old Testament, New Testament, General Knowledge"
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="title-id">Judul (Indonesian)</Label>
                  <Input
                    id="title-id"
                    value={formData.title.id}
                    onChange={(e) => handleInputChange('title', e.target.value, 'id')}
                    placeholder="Masukkan judul kuis"
                  />
                </div>

                <div>
                  <Label htmlFor="description-id">Deskripsi (Indonesian)</Label>
                  <Textarea
                    id="description-id"
                    value={formData.description.id}
                    onChange={(e) => handleInputChange('description', e.target.value, 'id')}
                    placeholder="Deskripsi singkat tentang kuis"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category-id">Kategori (Indonesian)</Label>
                  <Input
                    id="category-id"
                    value={formData.category.id}
                    onChange={(e) => handleInputChange('category', e.target.value, 'id')}
                    placeholder="misal: Perjanjian Lama, Perjanjian Baru, Pengetahuan Umum"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quiz Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
            <CardDescription>Configure difficulty and time limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => handleInputChange('difficulty', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time-limit">Time Limit (seconds)</Label>
              <Input
                id="time-limit"
                type="number"
                value={formData.time_limit_seconds}
                onChange={(e) => handleInputChange('time_limit_seconds', parseInt(e.target.value))}
                min="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set to 0 for no time limit
              </p>
            </div>

            <div>
              <Label htmlFor="pass-percentage">Pass Percentage (%)</Label>
              <Input
                id="pass-percentage"
                type="number"
                value={formData.pass_percentage}
                onChange={(e) => handleInputChange('pass_percentage', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>

            <div>
              <Label htmlFor="image-url">Featured Image URL</Label>
              <Input
                id="image-url"
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Add and configure quiz questions</CardDescription>
              </div>
              <Button type="button" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No questions yet. Click "Add Question" to start.</p>
              </div>
            ) : (
              formData.questions.map((question, qIndex) => (
                <div key={qIndex} className="border rounded-lg p-4">
                  {/* Question Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Question {qIndex + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedQuestion(expandedQuestion === qIndex ? null : qIndex)}
                      >
                        {expandedQuestion === qIndex ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(qIndex)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  {/* Question Preview (collapsed) */}
                  {expandedQuestion !== qIndex && (
                    <p className="text-sm text-gray-600 truncate">
                      {question.question.en || 'No question text'}
                    </p>
                  )}

                  {/* Question Editor (expanded) */}
                  {expandedQuestion === qIndex && (
                    <div className="space-y-4 pt-2">
                      <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                        <TabsList className="mb-4">
                          <TabsTrigger value="en">English</TabsTrigger>
                          <TabsTrigger value="id">Indonesian</TabsTrigger>
                        </TabsList>

                        <TabsContent value="en" className="space-y-4">
                          <div>
                            <Label>Question Text (English) *</Label>
                            <Textarea
                              value={question.question.en}
                              onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value, 'en')}
                              placeholder="Enter question"
                              rows={2}
                            />
                          </div>

                          <div>
                            <Label>Options (English) *</Label>
                            <div className="space-y-2">
                              {question.options.en.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <span className="text-sm font-medium w-6">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <Input
                                    value={option}
                                    onChange={(e) => handleQuestionChange(qIndex, 'options', e.target.value, 'en', optIndex)}
                                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  />
                                  {question.correct_answer === optIndex && (
                                    <span className="text-green-600 text-sm font-medium">✓ Correct</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Explanation (English)</Label>
                            <Textarea
                              value={question.explanation.en}
                              onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value, 'en')}
                              placeholder="Explain why this is the correct answer"
                              rows={2}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="id" className="space-y-4">
                          <div>
                            <Label>Teks Pertanyaan (Indonesian)</Label>
                            <Textarea
                              value={question.question.id}
                              onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value, 'id')}
                              placeholder="Masukkan pertanyaan"
                              rows={2}
                            />
                          </div>

                          <div>
                            <Label>Pilihan (Indonesian)</Label>
                            <div className="space-y-2">
                              {question.options.id.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <span className="text-sm font-medium w-6">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <Input
                                    value={option}
                                    onChange={(e) => handleQuestionChange(qIndex, 'options', e.target.value, 'id', optIndex)}
                                    placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Penjelasan (Indonesian)</Label>
                            <Textarea
                              value={question.explanation.id}
                              onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value, 'id')}
                              placeholder="Jelaskan mengapa ini jawaban yang benar"
                              rows={2}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>

                      <div>
                        <Label>Correct Answer</Label>
                        <Select
                          value={question.correct_answer.toString()}
                          onValueChange={(value) => handleQuestionChange(qIndex, 'correct_answer', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">A</SelectItem>
                            <SelectItem value="1">B</SelectItem>
                            <SelectItem value="2">C</SelectItem>
                            <SelectItem value="3">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Publishing Options */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>Control when and how this quiz is published</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="published">Published</Label>
                <p className="text-sm text-gray-500">Make this quiz visible to users</p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => handleInputChange('published', checked)}
              />
            </div>

            <div>
              <Label htmlFor="scheduled-date">Scheduled Date</Label>
              <Input
                id="scheduled-date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/content-center/quiz')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Quiz' : 'Create Quiz'}
          </Button>
        </div>
      </form>
    </div>
  );
}
